import { test } from "node:test";
import assert from "node:assert";

test("GET /api/members returns mock members in mock mode", async () => {
  const previousMode = process.env.DASHBOARD_API_MODE;
  process.env.DASHBOARD_API_MODE = "mock";

  try {
    const { GET } = await import("../app/api/members/route.js");
    const { mockMembers } = await import("../lib/mock-data.js");

    const req = new Request("http://localhost/api/members");
    const res: Response = await GET(req as any);
    const body = await res.json();

    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.data), "response data should be an array");
    assert.strictEqual(body.data.length, mockMembers.length);
  } finally {
    if (previousMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = previousMode;
    }
  }
});
