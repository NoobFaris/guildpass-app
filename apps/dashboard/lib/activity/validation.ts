import { z } from "zod";
import type { WebhookPayload } from "./types";
import { SUPPORTED_WEBHOOK_EVENTS } from "./types";

export type ValidationResult =
| { valid: true; payload: WebhookPayload }
| { valid: false; error: string; field?: string };

// 1. Define specific data schemas
const DataSchemas = {
"membership.created": z.object({ name: z.string().optional(), wallet: z.string().optional(), id: z.string().optional() }),
  "membership.updated": z.object({ name: z.string().optional(), wallet: z.string().optional(), id: z.string().optional() }),
  "pass.created": z.object({ name: z.string().optional(), id: z.string().optional() }),
  "pass.updated": z.object({ name: z.string().optional(), id: z.string().optional() }),
  "guild.updated": z.object({ name: z.string().optional(), id: z.string().optional() }),
  "verification.completed": z.object({ wallet: z.string().optional(), id: z.string().optional() }),
};

// 2. Base envelope schema
const EnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().positive(),
  data: z.record(z.unknown()),
});

export function validateWebhookPayload(rawBody: string): ValidationResult {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { valid: false, error: "Invalid JSON", field: "body" };
  }

  // Validate Envelope
  const envelopeResult = EnvelopeSchema.safeParse(parsed);
  if (!envelopeResult.success) {
    const error = envelopeResult.error.issues[0];
    return {
      valid: false,
      error: error.message,
      field: error.path.join("."),
    };
  }

  const payload = envelopeResult.data;

  // Validate Event-specific data
  // Only validate if it's a known supported event
  if ((SUPPORTED_WEBHOOK_EVENTS as readonly string[]).includes(payload.type)) {
    const schema = DataSchemas[payload.type as keyof typeof DataSchemas];
    const dataResult = schema.safeParse(payload.data);

    if (!dataResult.success) {
      const error = dataResult.error.issues[0];
      return {
        valid: false,
        error: error.message,
        field: `data.${error.path.join(".")}`,
      };
    }
  }

  return { valid: true, payload };
}