export type {
  ActivityEventType,
  ActivityEventSource,
  ActivityEventSeverity,
  ActivityEventEntity,
  ActivityEvent,
} from "@guildpass/integration-client";

type WebhookData = Record<string, unknown> & {
  id?: string;
  name?: string;
  wallet?: string;
};

export interface WebhookPayload {
  id: string;
  type: string;
  created: number;
  data: WebhookData;
}
