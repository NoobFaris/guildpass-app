import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@guildpass/webhook-utils";
import { getEnv } from "@/lib/env";
import { mapWebhookToActivity } from "@/lib/activity/mapper";
import { activityStorage } from "@/lib/activity/storage";
import { ActivityEvent, WebhookPayload } from "@/lib/activity/types";
import { validateWebhookPayload } from "@/lib/activity/validation";
import { sanitiseWebhookData, getSanitisedDescription } from "@/lib/activity/sanitise";

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

    const validation = validateWebhookPayload(rawBody);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const payload = validation.payload;

    // Map webhook event to dashboard activity
    const activity = mapWebhookToActivity(payload);

    if (activity) {
      const result = await activityStorage.recordActivityEvent(activity);
      if (result === "duplicate") {
        return NextResponse.json({ status: "ignored", reason: "duplicate" });
      }

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
