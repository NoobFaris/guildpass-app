import type { WebhookPayload } from "./types";

export type ValidationResult =
  | { valid: true; payload: WebhookPayload }
  | { valid: false; error: string; field?: string };

const EVENT_DATA_SCHEMA: Record<
  string,
  Record<string, "string" | "string?" | "number?">
> = {
  "membership.created": { name: "string?", wallet: "string?", id: "string?" },
  "membership.updated": { name: "string?", wallet: "string?", id: "string?" },
  "pass.created": { name: "string?", id: "string?" },
  "pass.updated": { name: "string?", id: "string?" },
  "guild.updated": { name: "string?", id: "string?" },
  "verification.completed": { wallet: "string?", id: "string?" },
};

type SupportedEvent = keyof typeof EVENT_DATA_SCHEMA;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateDataFields(
  type: string,
  data: unknown
): { field: string; message: string } | null {
  if (!isPlainObject(data)) {
    return { field: "data", message: "'data' must be a JSON object" };
  }

  const schema = EVENT_DATA_SCHEMA[type as SupportedEvent];
  if (!schema) {
    return null;
  }

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];
    const required = !rule.endsWith("?");

    if (required && (value === undefined || value === null)) {
      return {
        field: `data.${field}`,
        message: `Missing required field 'data.${field}' for '${type}' events`,
      };
    }

    if (value !== undefined && value !== null && typeof value !== rule.replace("?", "")) {
      return {
        field: `data.${field}`,
        message: `Field 'data.${field}' must be a ${rule.replace("?", "")} for '${type}' events`,
      };
    }
  }

  return null;
}

export function validateWebhookPayload(rawBody: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { valid: false, error: "Invalid JSON", field: "body" };
  }

  if (!isPlainObject(parsed)) {
    return { valid: false, error: "Payload must be a JSON object", field: "body" };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.id !== "string" || obj.id.length === 0) {
    return {
      valid: false,
      error: "Missing or invalid 'id' (must be a non-empty string)",
      field: "id",
    };
  }

  if (typeof obj.type !== "string" || obj.type.length === 0) {
    return {
      valid: false,
      error: "Missing or invalid 'type' (must be a non-empty string)",
      field: "type",
    };
  }

  if (typeof obj.created !== "number" || !Number.isFinite(obj.created) || obj.created <= 0) {
    return {
      valid: false,
      error: "Missing or invalid 'created' (must be a positive number)",
      field: "created",
    };
  }

  const dataError = validateDataFields(obj.type as string, obj.data);
  if (dataError) {
    return { valid: false, error: dataError.message, field: dataError.field };
  }

  if (obj.data === undefined || obj.data === null) {
    return { valid: false, error: "Missing required field 'data'", field: "data" };
  }

  return {
    valid: true,
    payload: {
      id: obj.id as string,
      type: obj.type as string,
      created: obj.created as number,
      data: obj.data as Record<string, unknown>,
    },
  };
}
