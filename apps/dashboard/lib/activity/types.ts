export type {
  ActivityEventType,
  ActivityEventSource,
  ActivityEventSeverity,
  ActivityEventEntity,
  ActivityEvent,
} from "@guildpass/integration-client";

export interface WebhookPayload {
  id: string;
  type: string;
  created: number;
  data: Record<string, any>;
}
