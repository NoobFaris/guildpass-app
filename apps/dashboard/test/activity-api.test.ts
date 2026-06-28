import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { GET } from "../app/api/activity/route";

describe("GET /api/activity", () => {
  test("returns a bounded filtered page with pagination metadata", async () => {
    const response = await GET(
      new Request("https://example.test/api/activity?limit=2&type=member.joined")
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.events));
    assert.ok(body.events.length <= 2);
    assert.ok(
      body.events.every((event: { type: string }) => event.type === "member.joined")
    );
    assert.ok("nextCursor" in body);
  });

  test("returns 400 with field errors for invalid query parameters", async () => {
    const response = await GET(
      new Request("https://example.test/api/activity?limit=zero&type=unknown&from=later")
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(
      body.errors.map((error: { field: string }) => error.field),
      ["limit", "type", "from"]
    );
  });
});
