/**
 * Next.js App Router Webhook Handler Example
 * 
 * This example demonstrates how to safely verify incoming webhooks
 * in a Next.js 13+ App Router route handler.
 * 
 * IMPORTANT: You must access the raw request body BEFORE parsing it.
 * 
 * File: app/api/webhooks/guildpass/route.ts
 */

import { verifySignature } from "@guildpass/webhook-utils";
import { NextResponse } from "next/server";

/**
 * Webhook event types from GuildPass
 */
type WebhookEvent =
  | {
      type: "member.joined";
      data: {
        memberId: string;
        guildId: string;
        userId: string;
        joinedAt: string;
      };
    }
  | {
      type: "member.left";
      data: {
        memberId: string;
        guildId: string;
        userId: string;
        leftAt: string;
      };
    }
  | {
      type: "pass.activated";
      data: {
        passId: string;
        guildId: string;
        userId: string;
        activatedAt: string;
        expiresAt: string;
      };
    }
  | {
      type: "pass.expired";
      data: {
        passId: string;
        guildId: string;
        userId: string;
        expiredAt: string;
      };
    }
  | {
      type: "guild.updated";
      data: {
        guildId: string;
        changes: Record<string, unknown>;
        updatedAt: string;
      };
    };

/**
 * POST /api/webhooks/guildpass
 * 
 * Receives and verifies webhooks from GuildPass
 */
export async function POST(request: Request) {
  try {
    // 1. Get the raw request body (CRITICAL: before any parsing)
    const rawBody = await request.text();

    // 2. Get the signature from headers
    const signature = request.headers.get("x-guildpass-signature");

    if (!signature) {
      console.error("Missing signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // 3. Get the webhook secret from environment
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.error("WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 }
      );
    }

    // 4. Verify the signature
    const result = verifySignature({
      signatureHeader: signature,
      secret,
      payload: rawBody,
      tolerance: 300, // 5 minutes
    });

    if (!result.valid) {
      console.error("Webhook verification failed:", {
        error: result.error,
        timestamp: result.timestamp,
        receivedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 5. Parse the verified payload
    const event = JSON.parse(rawBody) as WebhookEvent;

    console.log("Webhook verified:", {
      type: event.type,
      timestamp: result.timestamp,
      age: Date.now() / 1000 - result.timestamp!,
    });

    // 6. Process the event based on type
    await handleWebhookEvent(event);

    // 7. Return success
    return NextResponse.json({
      received: true,
      eventType: event.type,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    // Don't expose internal errors to the caller
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle different webhook event types
 */
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "member.joined":
      await handleMemberJoined(event.data);
      break;

    case "member.left":
      await handleMemberLeft(event.data);
      break;

    case "pass.activated":
      await handlePassActivated(event.data);
      break;

    case "pass.expired":
      await handlePassExpired(event.data);
      break;

    case "guild.updated":
      await handleGuildUpdated(event.data);
      break;

    default:
      // @ts-expect-error - exhaustive check
      console.warn("Unhandled event type:", event.type);
  }
}

/**
 * Event handlers
 */

async function handleMemberJoined(data: {
  memberId: string;
  guildId: string;
  userId: string;
  joinedAt: string;
}) {
  console.log("Member joined:", data);

  // Example: Update local database
  // await db.members.create({
  //   id: data.memberId,
  //   guildId: data.guildId,
  //   userId: data.userId,
  //   joinedAt: new Date(data.joinedAt),
  // });

  // Example: Send notification
  // await sendNotification({
  //   userId: data.userId,
  //   message: "Welcome to the guild!",
  // });

  // Example: Grant Discord role
  // await grantDiscordRole(data.userId, data.guildId);
}

async function handleMemberLeft(data: {
  memberId: string;
  guildId: string;
  userId: string;
  leftAt: string;
}) {
  console.log("Member left:", data);

  // Example: Update local database
  // await db.members.update({
  //   where: { id: data.memberId },
  //   data: { leftAt: new Date(data.leftAt) },
  // });

  // Example: Revoke Discord role
  // await revokeDiscordRole(data.userId, data.guildId);
}

async function handlePassActivated(data: {
  passId: string;
  guildId: string;
  userId: string;
  activatedAt: string;
  expiresAt: string;
}) {
  console.log("Pass activated:", data);

  // Example: Grant access
  // await grantAccess({
  //   userId: data.userId,
  //   guildId: data.guildId,
  //   expiresAt: new Date(data.expiresAt),
  // });
}

async function handlePassExpired(data: {
  passId: string;
  guildId: string;
  userId: string;
  expiredAt: string;
}) {
  console.log("Pass expired:", data);

  // Example: Revoke access
  // await revokeAccess({
  //   userId: data.userId,
  //   guildId: data.guildId,
  // });
}

async function handleGuildUpdated(data: {
  guildId: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}) {
  console.log("Guild updated:", data);

  // Example: Sync changes to local database
  // await db.guilds.update({
  //   where: { id: data.guildId },
  //   data: data.changes,
  // });
}

/**
 * Optional: Add a GET handler to verify the endpoint is accessible
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "GuildPass webhook endpoint",
  });
}
