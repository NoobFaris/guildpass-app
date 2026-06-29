/**
 * lib/validation/settings.ts
 *
 * Validation for PATCH /api/settings. Returns field-level errors in the same
 * `{ field, message }` shape the activity route already uses, so the client can
 * surface per-field messages. Validation is partial: only the fields present in
 * the request body are checked, and at least one supported field is required.
 */

import {
  ALLOWED_TIMEZONES,
  MAX_TEXT_LENGTH,
  type DashboardSettings,
} from "@/lib/settings";

export interface FieldError {
  field: string;
  message: string;
}

export type SettingsValidationResult =
  | { ok: true; value: Partial<DashboardSettings> }
  | { ok: false; errors: FieldError[] };

// Pragmatic email shape check — not RFC-complete, just enough to reject obvious
// garbage without depending on a library.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateText(
  body: Record<string, unknown>,
  field: keyof DashboardSettings,
  label: string,
  errors: FieldError[],
  value: Partial<DashboardSettings>
): void {
  const raw = body[field];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    errors.push({ field, message: `${label} is required.` });
    return;
  }
  const trimmed = raw.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    errors.push({
      field,
      message: `${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`,
    });
    return;
  }
  (value as Record<string, unknown>)[field] = trimmed;
}

export function validateSettingsPatch(input: unknown): SettingsValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      ok: false,
      errors: [{ field: "_root", message: "Request body must be a JSON object." }],
    };
  }

  const body = input as Record<string, unknown>;
  const errors: FieldError[] = [];
  const value: Partial<DashboardSettings> = {};

  if ("workspaceName" in body) {
    validateText(body, "workspaceName", "Workspace name", errors, value);
  }
  if ("displayName" in body) {
    validateText(body, "displayName", "Display name", errors, value);
  }

  if ("timezone" in body) {
    const tz = body.timezone;
    if (
      typeof tz !== "string" ||
      !ALLOWED_TIMEZONES.includes(tz as (typeof ALLOWED_TIMEZONES)[number])
    ) {
      errors.push({
        field: "timezone",
        message: `Timezone must be one of: ${ALLOWED_TIMEZONES.join(", ")}.`,
      });
    } else {
      value.timezone = tz;
    }
  }

  if ("email" in body) {
    const email = body.email;
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      errors.push({ field: "email", message: "A valid email address is required." });
    } else {
      value.email = email.trim();
    }
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push({
      field: "_root",
      message: "No supported settings fields were provided.",
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}
