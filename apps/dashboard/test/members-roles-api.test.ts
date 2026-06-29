import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { PATCH, POST, GET } from "../app/api/members/route";
import { clearRepositories, getMemberRepository } from "../lib/repositories/factory";
import { MOCK_API_ROLE } from "../lib/auth/session";

// The API-layer mock session defaults to "readonly": it can read members but
// every mutation is rejected server-side (this is the backend-enforcement demo).
describe("members route — role mutations", () => {
  beforeEach(() => clearRepositories());

  test("GET lists members (members:read is held by readonly)", async () => {
    const res = await GET(new Request("https://example.test/api/members"));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body));
  });

  test("PATCH role change is rejected for a read-only session (403)", async () => {
    assert.equal(MOCK_API_ROLE, "readonly");

    const res = await PATCH(
      new Request("https://example.test/api/members?id=1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: ["member", "contributor"] }),
      })
    );
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.ok(typeof body.error === "string" && body.error.length > 0);

    // The rejected mutation must not have changed the stored member.
    const member = await getMemberRepository().getById("1");
    assert.deepEqual(member?.roles, ["admin", "member"]);
  });

  test("POST create is rejected for a read-only session (403)", async () => {
    const res = await POST(
      new Request("https://example.test/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Eve", wallet: "0xabc", roles: ["root"] }),
      })
    );

    assert.equal(res.status, 403);
  });
});
