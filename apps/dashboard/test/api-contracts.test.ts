import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { apiUnsupported, handleApiError } from "../lib/api-helpers";

describe("dashboard API response contract", () => {
  test("wraps successful route responses", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/passes/route.js");
      const response = await GET();
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.ok(Array.isArray(body.data));
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("returns validation errors with field-level details", async () => {
    const { POST } = await import("../app/api/verify/route.js");
    const response = await POST(
      new Request("https://example.test/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: "0xabc" }),
      }) as any
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.deepEqual(body.fields, [
      { field: "discordUserId", message: "discordUserId is required" },
    ]);
  });

  test("returns permission errors with the shared error shape", async () => {
    const { POST } = await import("../app/api/passes/route.js");
    const response = await POST(
      new Request("https://example.test/api/passes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Founders", description: "Access" }),
      })
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.ok, false);
    assert.equal(body.code, "FORBIDDEN");
    assert.match(body.error, /passes:write/);
  });

  test("returns unsupported live-mode responses with a dedicated shape", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "live";

    try {
      const { GET } = await import("../app/api/passes/route.js");
      const response = await GET();
      const body = await response.json();

      assert.equal(response.status, 501);
      assert.equal(body.ok, false);
      assert.equal(body.code, "UNSUPPORTED");
      assert.deepEqual(body.unsupported, { feature: "passes.list", mode: "live" });
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("returns server errors through handleApiError", async () => {
    const response = await handleApiError(async () => {
      throw new Error("database unavailable");
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.ok, false);
    assert.equal(body.code, "SERVER_ERROR");
    assert.equal(body.error, "An unexpected error occurred");
    assert.equal(typeof body.errorId, "string");
  });

  test("builds unsupported responses from the shared helper", async () => {
    const response = apiUnsupported(
      "integrations.sync",
      "live",
      "Integration sync is not implemented"
    );
    const body = await response.json();

    assert.equal(response.status, 501);
    assert.equal(body.ok, false);
    assert.equal(body.code, "UNSUPPORTED");
    assert.equal(body.unsupported.feature, "integrations.sync");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
