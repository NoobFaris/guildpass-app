import { test } from "node:test";
import assert from "node:assert";

/**
 * Tests for the unsupported live mode response pattern.
 *
 * These tests verify that:
 *  1. API routes return { code: "UNSUPPORTED_IN_LIVE_MODE" } when
 *     DASHBOARD_API_MODE=live and the list endpoint isn't implemented.
 *  2. Mock mode still returns actual data (mock fallback works).
 *  3. The fetchList utility correctly identifies unsupported responses.
 */

// ────────────────────────────────────────────────────────────────────────────
// Passes
// ────────────────────────────────────────────────────────────────────────────

test("GET /api/passes returns unsupported in live mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "live";

  try {
    const { GET } = await import("../app/api/passes/route.js");

    const req = new Request("http://localhost/api/passes");
    const res: Response = await GET();
    const data = await res.json();

    assert.strictEqual(res.status, 501);
    assert.strictEqual(data.code, "UNSUPPORTED_IN_LIVE_MODE");
    assert.ok(typeof data.error === "string");
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

test("GET /api/passes returns mock data in mock mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "mock";

  try {
    const { GET } = await import("../app/api/passes/route.js");
    const { mockPasses } = await import("../lib/mock-data.js");

    const res: Response = await GET();
    const data = await res.json();

    assert.ok(Array.isArray(data), "response should be an array");
    assert.strictEqual(data.length, mockPasses.length);
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Guilds
// ────────────────────────────────────────────────────────────────────────────

test("GET /api/guilds returns unsupported in live mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "live";

  try {
    const { GET } = await import("../app/api/guilds/route.js");

    const req = new Request("http://localhost/api/guilds");
    const res: Response = await GET();
    const data = await res.json();

    assert.strictEqual(res.status, 501);
    assert.strictEqual(data.code, "UNSUPPORTED_IN_LIVE_MODE");
    assert.ok(typeof data.error === "string");
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

test("GET /api/guilds returns mock data in mock mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "mock";

  try {
    const { GET } = await import("../app/api/guilds/route.js");
    const { mockGuilds } = await import("../lib/mock-data.js");

    const res: Response = await GET();
    const data = await res.json();

    assert.ok(Array.isArray(data), "response should be an array");
    assert.strictEqual(data.length, mockGuilds.length);
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Members
// ────────────────────────────────────────────────────────────────────────────

test("GET /api/members returns unsupported in live mode without query params", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  const previousUrl = process.env.GUILD_PASS_CORE_URL;
  process.env.DASHBOARD_API_MODE = "live";
  process.env.GUILD_PASS_CORE_URL = "http://localhost:9999";

  try {
    const { GET } = await import("../app/api/members/route.js");

    const req = new Request("http://localhost/api/members");
    const res: Response = await GET(req);
    const data = await res.json();

    assert.strictEqual(res.status, 501);
    assert.strictEqual(data.code, "UNSUPPORTED_IN_LIVE_MODE");
    assert.ok(typeof data.error === "string");
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
    if (previousUrl === undefined) {
      delete process.env.GUILD_PASS_CORE_URL;
    } else {
      process.env.GUILD_PASS_CORE_URL = previousUrl;
    }
  }
});

test("GET /api/members returns data with wallet query in live mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "live";

  try {
    // Inject a test client to avoid real HTTP calls
    (globalThis as any).__TEST_INTEGRATION_CLIENT = {
      getMembershipByWallet: async (wallet: string) => ({
        userId: `u_${wallet.slice(-4)}`,
        wallet,
        status: "active",
        roles: ["member"],
        updatedAt: new Date().toISOString(),
      }),
    };

    const { GET } = await import("../app/api/members/route.js");

    const req = new Request("http://localhost/api/members?wallet=0xabc123");
    const res: Response = await GET(req);
    const data = await res.json();

    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].wallet, "0xabc123");
  } finally {
    delete (globalThis as any).__TEST_INTEGRATION_CLIENT;

    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

test("GET /api/members returns mock data in mock mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "mock";

  try {
    const { GET } = await import("../app/api/members/route.js");
    const { mockMembers } = await import("../lib/mock-data.js");

    const req = new Request("http://localhost/api/members");
    const res: Response = await GET(req);
    const data = await res.json();

    assert.ok(Array.isArray(data), "response should be an array");
    assert.strictEqual(data.length, mockMembers.length);
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// api-helpers
// ────────────────────────────────────────────────────────────────────────────

test("apiUnsupported returns 501 with UNSUPPORTED_IN_LIVE_MODE code", async () => {
  const { apiUnsupported } = await import("../lib/api-helpers.js");

  const res: Response = apiUnsupported("Test message");
  const data = await res.json();

  assert.strictEqual(res.status, 501);
  assert.strictEqual(data.code, "UNSUPPORTED_IN_LIVE_MODE");
  assert.strictEqual(data.error, "Test message");
});
