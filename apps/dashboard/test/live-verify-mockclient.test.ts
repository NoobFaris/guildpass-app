import { test } from "node:test";
import assert from "node:assert";

test("POST /api/verify uses injected IntegrationClient in live mode via mock client", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "live";

  try {
    (globalThis as any).__TEST_INTEGRATION_CLIENT = {
      verifyWallet: async (discordUserId: string, wallet: string) => ({
        userId: discordUserId,
        wallet,
        verified: true,
        message: "mocked",
      }),
    };

    const { POST } = await import("../app/api/verify/route.js");

    const payload = { discordUserId: "u_inj", wallet: "0xfeed" };
    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req as any);
    const body = await res.json();

    assert.strictEqual(body.ok, true);
    const data = body.data;
    assert.strictEqual(data.userId, payload.discordUserId);
    assert.strictEqual(data.wallet, payload.wallet);
    assert.strictEqual(data.verified, true);
  } finally {
    delete (globalThis as any).__TEST_INTEGRATION_CLIENT;

    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});
