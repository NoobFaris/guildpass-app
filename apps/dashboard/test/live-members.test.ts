import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";

process.env.DASHBOARD_API_MODE = "live";

test("GET /api/members performs live wallet lookup via core API", async () => {
  // Note: this test requires a mock HTTP server; see live-members-mockclient for injected version
  // Start a tiny HTTP server that mimics the core API
  const server = http.createServer((req, res) => {
    if (!req.url) return res.end();

    const url = new URL(req.url, `http://localhost`);

    if (url.pathname.startsWith("/v1/memberships/wallet/")) {
      const wallet = decodeURIComponent(url.pathname.replace("/v1/memberships/wallet/", ""));
      const payload = {
        userId: `user_${wallet.slice(-6)}`,
        wallet,
        status: "active",
        roles: ["member"],
        updatedAt: new Date().toISOString(),
      };
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(payload));
    }

    if (url.pathname.startsWith("/v1/memberships/discord/")) {
      const id = decodeURIComponent(url.pathname.replace("/v1/memberships/discord/", ""));
      const payload = {
        userId: id,
        wallet: "0xdeadbeef",
        status: "active",
        roles: ["member"],
        updatedAt: new Date().toISOString(),
      };
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(payload));
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
    const { GET } = await import("../app/api/members/route");

    const req = new Request("http://localhost/api/members?wallet=0xabc123");
    const res: Response = await GET(req as any);
    const data = await res.json();

    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].wallet, "0xabc123");
  } finally {
    server.close();
  }
});
