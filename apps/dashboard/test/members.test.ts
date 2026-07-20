import { test } from "node:test";
import assert from "node:assert";

test("GET /api/members returns mock members in mock mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "mock";

  try {
    const { GET } = await import("../app/api/members/route.js");
    const { DEFAULT_GUILD_ID, mockMembers } = await import("../lib/mock-data.js");
    const { GUILD_ID_HEADER } = await import("../lib/guild-context.js");

    // Unscoped request falls back to the default guild tenant.
    const defaultScoped = mockMembers.filter((m) => m.guildId === DEFAULT_GUILD_ID);
    const req = new Request("http://localhost/api/members");
    const res: Response = await GET(req as any);
    const body = await res.json();

    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.data.items), "response data should include items");
    assert.strictEqual(body.data.total, defaultScoped.length);
    assert.ok(body.data.items.every((m: { guildId: string }) => m.guildId === DEFAULT_GUILD_ID));

    // Explicit X-Guild-Id scopes to another tenant's members only.
    const guild2 = mockMembers.filter((m) => m.guildId === "2");
    const scopedReq = new Request("http://localhost/api/members", {
      headers: { [GUILD_ID_HEADER]: "2" },
    });
    const scopedRes: Response = await GET(scopedReq as any);
    const scopedBody = await scopedRes.json();

    assert.strictEqual(scopedBody.ok, true);
    assert.strictEqual(scopedBody.data.total, guild2.length);
    assert.ok(
      scopedBody.data.items.every((m: { guildId: string }) => m.guildId === "2"),
      "all returned members must belong to the requested guild"
    );
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});
