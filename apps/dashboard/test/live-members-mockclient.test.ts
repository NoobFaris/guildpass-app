import { test } from "node:test";
import assert from "node:assert";

process.env.DASHBOARD_API_MODE = "live";

test("GET /api/members uses injected IntegrationClient in live mode via mock client", async () => {
  // inject a fake client
  (globalThis as any).__TEST_INTEGRATION_CLIENT = {
    getMembershipByWallet: async (wallet: string) => ({
      userId: `u_${wallet.slice(-4)}`,
      wallet,
      status: "active",
      roles: ["member"],
      updatedAt: new Date().toISOString(),
    }),
    getMembershipByDiscordUser: async (id: string) => ({
      userId: id,
      wallet: "0xtest",
      status: "active",
      roles: ["member"],
      updatedAt: new Date().toISOString(),
    }),
  };

  const { GET } = await import("../app/api/members/route.js");
  const req = new Request("http://localhost/api/members?wallet=0xabc123");
  const res = await GET(req);
  const data = await res.json();

  assert.ok(Array.isArray(data));
  assert.strictEqual(data.length, 1);
  assert.strictEqual(data[0].wallet, "0xabc123");

  delete (globalThis as any).__TEST_INTEGRATION_CLIENT;
});
