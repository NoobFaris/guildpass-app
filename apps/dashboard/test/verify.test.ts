import { test } from "node:test";
import assert from "node:assert";

process.env.DASHBOARD_API_MODE = "mock";

test("POST /api/verify returns mock verification in mock mode", async () => {
  const { POST } = await import("../app/api/verify/route.js");

  const payload = { discordUserId: "user_123", wallet: "0xabc" };
  const req = new Request("http://localhost/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const res = await POST(req);
  const data = await res.json();

  // In mock mode we return a mock verification object
  assert.strictEqual(data.wallet, payload.wallet);
  assert.strictEqual(data.userId, payload.discordUserId);
  assert.strictEqual(data.verified, true);
});
