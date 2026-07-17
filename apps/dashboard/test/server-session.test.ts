/**
 * test/server-session.test.ts
 *
 * Tests for the server-side session resolution module.
 *
 * Coverage:
 *  - Mock mode returns MOCK_API_SESSION (predictable local role testing)
 *  - Live mode throws UnauthorizedError (not yet implemented)
 *  - requireDashboardSession delegates to getDashboardSession
 *  - UnauthorizedError carries statusCode 401
 */

import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardSession,
  requireDashboardSession,
  UnauthorizedError,
} from "../lib/auth/server-session.ts";
import { MOCK_API_SESSION, MOCK_API_ROLE } from "../lib/auth/session.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/test");
}

// ── UnauthorizedError ────────────────────────────────────────────────────────

describe("UnauthorizedError", () => {
  test("is an instance of Error", () => {
    const e = new UnauthorizedError();
    assert.ok(e instanceof Error);
  });

  test("name is 'UnauthorizedError'", () => {
    const e = new UnauthorizedError();
    assert.equal(e.name, "UnauthorizedError");
  });

  test("statusCode is 401", () => {
    const e = new UnauthorizedError();
    assert.equal(e.statusCode, 401);
  });

  test("default message is descriptive", () => {
    const e = new UnauthorizedError();
    assert.ok(e.message.includes("Unauthorized"));
  });

  test("accepts a custom message", () => {
    const e = new UnauthorizedError("Custom error");
    assert.equal(e.message, "Custom error");
  });
});

// ── getDashboardSession (mock mode) ───────────────────────────────────────────

describe("getDashboardSession — mock mode", () => {
  const request = makeRequest();

  test("returns a Session object", () => {
    const session = getDashboardSession(request);
    assert.ok(session);
    assert.equal(typeof session.userId, "string");
    assert.equal(typeof session.role, "string");
    assert.ok(Array.isArray(session.permissions));
  });

  test("returns MOCK_API_SESSION (same userId and role)", () => {
    const session = getDashboardSession(request);
    assert.equal(session.userId, MOCK_API_SESSION.userId);
    assert.equal(session.role, MOCK_API_SESSION.role);
    assert.equal(session.name, MOCK_API_SESSION.name);
  });

  test("permissions match the role defined by MOCK_API_ROLE", () => {
    const session = getDashboardSession(request);
    assert.deepEqual(session.permissions, MOCK_API_SESSION.permissions);
  });

  test("works independently of the request content (mock ignores it)", () => {
    const session1 = getDashboardSession(makeRequest());
    const session2 = getDashboardSession(new Request("http://localhost:3000/api/other"));
    assert.equal(session1.userId, session2.userId);
  });
});

// ── requireDashboardSession (mock mode) ───────────────────────────────────────

describe("requireDashboardSession — mock mode", () => {
  const request = makeRequest();

  test("returns the same session as getDashboardSession", () => {
    const got = getDashboardSession(request);
    const required = requireDashboardSession(request);
    assert.equal(required.userId, got.userId);
    assert.equal(required.role, got.role);
  });

  test("does not throw in mock mode", () => {
    assert.doesNotThrow(() => {
      requireDashboardSession(makeRequest());
    });
  });
});

// ── getDashboardSession (live mode — not implemented) ─────────────────────────

describe("getDashboardSession — live mode (not yet implemented)", () => {
  const originalMode = process.env.DASHBOARD_API_MODE;
  const request = makeRequest();

  afterEach(() => {
    // Restore original env after each test
    if (originalMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = originalMode;
    }
  });

  test("throws UnauthorizedError when DASHBOARD_API_MODE=live", () => {
    process.env.DASHBOARD_API_MODE = "live";
    assert.throws(
      () => getDashboardSession(request),
      (err: unknown) => {
        assert.ok(err instanceof UnauthorizedError, "should be UnauthorizedError");
        return true;
      }
    );
  });

  test("thrown error has statusCode 401", () => {
    process.env.DASHBOARD_API_MODE = "live";
    try {
      getDashboardSession(request);
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err instanceof UnauthorizedError);
      assert.equal(err.statusCode, 401);
    }
  });

  test("thrown error message mentions live mode", () => {
    process.env.DASHBOARD_API_MODE = "live";
    try {
      getDashboardSession(request);
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.toLowerCase().includes("live"),
        `message "${err.message}" should mention live mode`
      );
    }
  });
});

// ── requireDashboardSession (live mode — not implemented) ─────────────────────

describe("requireDashboardSession — live mode (not yet implemented)", () => {
  const originalMode = process.env.DASHBOARD_API_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.DASHBOARD_API_MODE;
    } else {
      process.env.DASHBOARD_API_MODE = originalMode;
    }
  });

  test("throws UnauthorizedError when DASHBOARD_API_MODE=live", () => {
    process.env.DASHBOARD_API_MODE = "live";
    assert.throws(
      () => requireDashboardSession(makeRequest()),
      UnauthorizedError
    );
  });
});
