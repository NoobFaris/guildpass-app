import type { ActivityEvent, WebhookPayload } from "./types";

function displayValue(...values: Array<unknown>): string {
  const value = values.find((item) => typeof item === "string" && item.length > 0);
  return typeof value === "string" ? value : "Unknown";
}

export function mapWebhookToActivity(payload: WebhookPayload): ActivityEvent | null {
  const { type, data, id, created } = payload;
  const timestamp = new Date(created * 1000).toISOString();

  switch (type) {
    case "membership.created": {
      const memberLabel = displayValue(data.name, data.wallet, data.id);

      return {
        id,
        type: "member.joined",
        source: "webhook",
        severity: "info",
        actor: {
          name: data.name,
          wallet: data.wallet,
        },
        description: `New member joined: ${memberLabel}`,
        timestamp,
        entity: {
          type: "member",
          id: data.id,
          name: data.name,
        },
        metadata: data,
      };
    }

    case "membership.updated": {
      const memberLabel = displayValue(data.name, data.wallet, data.id);

      return {
        id,
        type: "member.left",
        source: "webhook",
        severity: "info",
        actor: {
          name: data.name,
          wallet: data.wallet,
        },
        description: `Member ${memberLabel} updated`,
        timestamp,
        entity: {
          type: "member",
          id: data.id,
          name: data.name,
        },
        metadata: data,
      };
    }

    case "pass.created": {
      const passLabel = displayValue(data.name, data.id);

      return {
        id,
        type: "pass.created",
        source: "webhook",
        severity: "info",
        actor: {
          name: "Admin",
        },
        description: `New pass created: ${passLabel}`,
        timestamp,
        entity: {
          type: "pass",
          id: data.id,
          name: data.name,
        },
        metadata: data,
      };
    }

    case "pass.updated": {
      const passLabel = displayValue(data.name, data.id);

      return {
        id,
        type: "pass.updated",
        source: "webhook",
        severity: "info",
        actor: {
          name: "Admin",
        },
        description: `Pass updated: ${passLabel}`,
        timestamp,
        entity: {
          type: "pass",
          id: data.id,
          name: data.name,
        },
        metadata: data,
      };
    }

    case "guild.updated": {
      const guildLabel = displayValue(data.name, data.id);

      return {
        id,
        type: "guild.updated",
        source: "webhook",
        severity: "info",
        actor: {
          name: "Admin",
        },
        description: `Guild settings updated: ${guildLabel}`,
        timestamp,
        entity: {
          type: "guild",
          id: data.id,
          name: data.name,
        },
        metadata: data,
      };
    }

    case "verification.completed":
      return {
        id,
        type: "verification.completed",
        source: "webhook",
        severity: "info",
        actor: {
          wallet: data.wallet,
        },
        description: `Verification completed for ${displayValue(data.wallet)}`,
        timestamp,
        entity: {
          type: "verification",
          id: data.wallet,
        },
        metadata: data,
      };

    default:
      return null;
  }
}
