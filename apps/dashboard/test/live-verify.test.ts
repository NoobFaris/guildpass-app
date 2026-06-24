import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";

process.env.DASHBOARD_API_MODE = "live";

test("POST /api/verify forwards to core API in live mode", async () => {
  // Note: this test requires a mock HTTP server; see live-verify-mockclient for injected version
  const server = http.createServer((req, res) => {
    if (!req.url) return res.end();
    const url = new URL(req.url, `http://localhost`);

    if (url.pathname === "/v1/verify" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        const result = {
          userId: parsed.discordUserId,
          wallet: parsed.wallet,
          verified: true,
          message: "verified by fake core",
        };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to start server");
  const port = addr.port;

  process.env.GUILD_PASS_CORE_URL = `http://127.0.0.1:${port}`;

  try {
    const { POST } = await import("../app/api/verify/route.js");

    const payload = { discordUserId: "u_live", wallet: "0xfeed" };
    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.userId, payload.discordUserId);
    assert.strictEqual(data.wallet, payload.wallet);
    assert.strictEqual(data.verified, true);
  } finally {
    server.close();
  }
});
