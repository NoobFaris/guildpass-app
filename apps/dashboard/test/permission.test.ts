import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  hasPermission,
  canManagePasses,
  canManageMembers,
  canManageGuilds,
  canEditSettings,
  assertPermission,
  PermissionDeniedError,
} from "../lib/permissions";
import {
  SESSION_ADMIN,
  SESSION_MODERATOR,
  SESSION_READONLY,
  SESSION_OWNER,
} from "./fixtures";
import type { Session, Permission } from "../lib/auth/session";

/**
 * permissions.test.ts
 *
 * Tests for the pure permission helper functions in lib/permissions.ts.
 * No network, no Next.js — pure function tests.
 */

// ── hasPermission ──────────────────────────────────────────────────────────────

describe("hasPermission", () => {
  test("returns true when the session holds the requested permission", () => {
    assert.equal(hasPermission(SESSION_ADMIN, "passes:write"), true);
  });

  test("returns false when the session does not hold the requested permission", () => {
    assert.equal(hasPermission(SESSION_READONLY, "passes:write"), false);
  });

  test("is case-sensitive: 'passes:Write' is not the same as 'passes:write'", () => {
    const session: Session = {
      ...SESSION_ADMIN,
      permissions: ["passes:write"],
    };
    // @ts-expect-error — intentionally passing wrong case to test runtime behaviour
    assert.equal(hasPermission(session, "passes:Write"), false);
  });

  test("returns false for a session with an empty permissions array", () => {
    const empty: Session = { ...SESSION_READONLY, permissions: [] };
    assert.equal(hasPermission(empty, "passes:read"), false);
  });
});

// ── canManagePasses ────────────────────────────────────────────────────────────

describe("canManagePasses", () => {
  test("returns true for admin (has passes:write)", () => {
    assert.equal(canManagePasses(SESSION_ADMIN), true);
  });

  test("returns true for owner (has passes:write)", () => {
    assert.equal(canManagePasses(SESSION_OWNER), true);
  });

  test("returns false for moderator (no passes:write)", () => {
    assert.equal(canManagePasses(SESSION_MODERATOR), false);
  });

  test("returns false for readonly (no passes:write)", () => {
    assert.equal(canManagePasses(SESSION_READONLY), false);
  });
});

// ── canManageMembers ───────────────────────────────────────────────────────────

describe("canManageMembers", () => {
  test("returns true for admin (has members:write)", () => {
    assert.equal(canManageMembers(SESSION_ADMIN), true);
  });

  test("returns true for moderator (has members:write)", () => {
    assert.equal(canManageMembers(SESSION_MODERATOR), true);
  });

  test("returns false for readonly (no members:write)", () => {
    assert.equal(canManageMembers(SESSION_READONLY), false);
  });
});

// ── canManageGuilds ────────────────────────────────────────────────────────────

describe("canManageGuilds", () => {
  test("returns true for admin (has guilds:write)", () => {
    assert.equal(canManageGuilds(SESSION_ADMIN), true);
  });

  test("returns false for moderator (no guilds:write)", () => {
    assert.equal(canManageGuilds(SESSION_MODERATOR), false);
  });

  test("returns false for readonly (no guilds:write)", () => {
    assert.equal(canManageGuilds(SESSION_READONLY), false);
  });
});

// ── canEditSettings ────────────────────────────────────────────────────────────

describe("canEditSettings", () => {
  test("returns true for admin (has settings:write)", () => {
    assert.equal(canEditSettings(SESSION_ADMIN), true);
  });

  test("returns false for moderator (no settings:write)", () => {
    assert.equal(canEditSettings(SESSION_MODERATOR), false);
  });

  test("returns false for readonly (no settings:write)", () => {
    assert.equal(canEditSettings(SESSION_READONLY), false);
  });
});

// ── assertPermission ───────────────────────────────────────────────────────────

describe("assertPermission", () => {
  test("does not throw when the session holds the permission", () => {
    assert.doesNotThrow(() => {
      assertPermission(SESSION_ADMIN, "passes:write");
    });
  });

  test("throws PermissionDeniedError when the session lacks the permission", () => {
    assert.throws(
      () => assertPermission(SESSION_READONLY, "passes:write"),
      (err: unknown) => {
        assert.ok(err instanceof PermissionDeniedError, "should be PermissionDeniedError");
        return true;
      }
    );
  });

  test("thrown error carries the denied permission name", () => {
    try {
      assertPermission(SESSION_MODERATOR, "guilds:write");
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err instanceof PermissionDeniedError);
      assert.equal(err.permission, "guilds:write");
    }
  });

  test("thrown error has statusCode 403", () => {
    try {
      assertPermission(SESSION_READONLY, "members:write");
    } catch (err) {
      assert.ok(err instanceof PermissionDeniedError);
      assert.equal(err.statusCode, 403);
    }
  });

  test("error message includes the permission name", () => {
    try {
      assertPermission(SESSION_READONLY, "settings:write");
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("settings:write"),
        `message "${err.message}" should include 'settings:write'`
      );
    }
  });
});

// ── PermissionDeniedError ──────────────────────────────────────────────────────

describe("PermissionDeniedError", () => {
  test("is an instance of Error", () => {
    const e = new PermissionDeniedError("passes:write");
    assert.ok(e instanceof Error);
  });

  test("name is PermissionDeniedError", () => {
    const e = new PermissionDeniedError("passes:write");
    assert.equal(e.name, "PermissionDeniedError");
  });

  test("permission property matches constructor argument", () => {
    const e = new PermissionDeniedError("members:write");
    assert.equal(e.permission, "members:write");
  });

  test("statusCode is always 403", () => {
    const e = new PermissionDeniedError("guilds:write");
    assert.equal(e.statusCode, 403);
  });
});

// ── Role matrix cross-check ────────────────────────────────────────────────────

describe("Role permission matrix — read permissions are universal", () => {
  const readPerms: Permission[] = [
    "passes:read",
    "members:read",
    "guilds:read",
    "settings:read",
  ];

  for (const perm of readPerms) {
    test(`${perm} is granted to all roles`, () => {
      assert.equal(hasPermission(SESSION_OWNER, perm), true, `owner missing ${perm}`);
      assert.equal(hasPermission(SESSION_ADMIN, perm), true, `admin missing ${perm}`);
      assert.equal(hasPermission(SESSION_MODERATOR, perm), true, `moderator missing ${perm}`);
      assert.equal(hasPermission(SESSION_READONLY, perm), true, `readonly missing ${perm}`);
    });
  }
});

describe("Role permission matrix — write permissions require at least admin", () => {
  const writePerms: Permission[] = [
    "passes:write",
    "guilds:write",
    "settings:write",
  ];

  for (const perm of writePerms) {
    test(`${perm} is denied to moderator and readonly`, () => {
      assert.equal(hasPermission(SESSION_MODERATOR, perm), false, `moderator should not have ${perm}`);
      assert.equal(hasPermission(SESSION_READONLY, perm), false, `readonly should not have ${perm}`);
    });
  }
});