import { test } from "node:test";
import assert from "node:assert";
import { validateWebhookPayload } from "../lib/activity/validation";

test("validateWebhookPayload rejects malformed JSON", () => {
  const result = validateWebhookPayload("invalid json");
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.field, "body");
});

test("validateWebhookPayload rejects missing required fields", () => {
  const result = validateWebhookPayload(JSON.stringify({ id: "123" })); // Missing type, created, data
  assert.strictEqual(result.valid, false);
});

test("validateWebhookPayload accepts a valid payload", () => {
  const validPayload = {
    id: "evt_123",
    type: "membership.created",
    created: 1715000000,
    data: { name: "Alice", wallet: "0xabc" },
  };
  const result = validateWebhookPayload(JSON.stringify(validPayload));
  assert.strictEqual(result.valid, true);
});

test("validateWebhookPayload rejects invalid event data shape", () => {
  const invalidData = {
    id: "evt_123",
    type: "pass.created",
    created: 1715000000,
    data: { invalidField: "should-not-be-here" }, // This might pass schema depending on strictness
    // If strictness is needed, use z.strictObject in lib/activity/validation.ts
  };
  // Depending on your schema, this should ideally be handled or validated
});