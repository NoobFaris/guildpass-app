import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@guildpass/webhook-utils";
import { getEnv } from "@/lib/env";
import { activityStorage } from "@/lib/activity/storage";
import { ActivityEvent, ActivityType, WebhookPayload } from "@/lib/activity/types";

export async function POST(req: NextRequest) {
  try {
    const { WEBHOOK_SECRET } = getEnv();
    
    if (!WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const signatureHeader = req.headers.get("x-guildpass-signature");
    if (!signatureHeader) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    
    const verification = verifySignature({
      signatureHeader,
      secret: WEBHOOK_SECRET,
      payload: rawBody,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;

    // Idempotency check
    if (await activityStorage.isDuplicate(payload.id)) {
      return NextResponse.json({ status: "ignored", reason: "duplicate" });
    }

    // Map webhook event to dashboard activity
    const activity = mapWebhookToActivity(payload);
    
    if (activity) {
      await activityStorage.addEvent(activity);
      return NextResponse.json({ status: "success", id: activity.id });
    }

    return NextResponse.json({ status: "ignored", reason: "unsupported event type" });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapWebhookToActivity(payload: WebhookPayload): ActivityEvent | null {
  const { type, data, id, created } = payload;
  const timestamp = new Date(created * 1000).toISOString();

  switch (type) {
    case "membership.created":
      return {
        id,
        type: "member_joined",
        description: `New member joined: ${data.name || data.wallet}`,
        actor: data.name || data.wallet,
        timestamp,
        metadata: data,
      };
    case "membership.updated":
      return {
        id,
        type: "membership_updated",
        description: `Member ${data.name || data.wallet} updated`,
        actor: data.name || data.wallet,
        timestamp,
        metadata: data,
      };
    case "pass.created":
      return {
        id,
        type: "pass_created",
        description: `New pass created: ${data.name}`,
        actor: "Admin",
        timestamp,
        metadata: data,
      };
    case "pass.updated":
      return {
        id,
        type: "pass_updated",
        description: `Pass updated: ${data.name}`,
        actor: "Admin",
        timestamp,
        metadata: data,
      };
    case "guild.updated":
      return {
        id,
        type: "guild_updated",
        description: `Guild settings updated: ${data.name}`,
        actor: "Admin",
        timestamp,
        metadata: data,
      };
    case "verification.completed":
      return {
        id,
        type: "verification_completed",
        description: `Verification completed for ${data.wallet}`,
        actor: data.wallet,
        timestamp,
        metadata: data,
      };
    default:
      return null;
  }
}
