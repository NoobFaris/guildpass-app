import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  MEMBER_ROLES,
  isMemberRole,
  addRole,
  removeRole,
  validateRoles,
} from "../lib/member-roles";

describe("isMemberRole", () => {
  test("accepts supported roles", () => {
    for (const role of MEMBER_ROLES) assert.equal(isMemberRole(role), true);
  });

  test("rejects unsupported values", () => {
    assert.equal(isMemberRole("superadmin"), false);
    assert.equal(isMemberRole(""), false);
    assert.equal(isMemberRole(42), false);
    assert.equal(isMemberRole(null), false);
  });
});

describe("addRole", () => {
  test("adds a supported role", () => {
    assert.deepEqual(addRole(["member"], "contributor"), ["member", "contributor"]);
  });

  test("does not create a duplicate", () => {
    assert.deepEqual(addRole(["member"], "member"), ["member"]);
  });

  test("ignores an unsupported role", () => {
    assert.deepEqual(addRole(["member"], "hacker"), ["member"]);
  });
});

describe("removeRole", () => {
  test("removes an existing role", () => {
    assert.deepEqual(removeRole(["admin", "member"], "admin"), ["member"]);
  });

  test("is a no-op when the role is absent", () => {
    assert.deepEqual(removeRole(["member"], "admin"), ["member"]);
  });
});

describe("validateRoles", () => {
  test("accepts supported roles and de-duplicates", () => {
    const result = validateRoles(["member", "member", "admin"]);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.roles, ["member", "admin"]);
  });

  test("accepts an empty array", () => {
    const result = validateRoles([]);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.roles, []);
  });

  test("rejects an array containing an unsupported role", () => {
    const result = validateRoles(["member", "root"]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.invalid, ["root"]);
  });

  test("reports every unsupported value", () => {
    const result = validateRoles(["root", "member", "ceo"]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.invalid.sort(), ["ceo", "root"]);
  });

  test("rejects a non-array body", () => {
    assert.equal(validateRoles("member").ok, false);
    assert.equal(validateRoles(null).ok, false);
    assert.equal(validateRoles({ roles: ["member"] }).ok, false);
  });
});
