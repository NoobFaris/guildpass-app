import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  normalisePagination,
  paginateItems,
} from "../lib/pagination";

describe("pagination boundary helpers", () => {
  test("normalisePagination falls back for zero and negative limits", () => {
    assert.deepEqual(normalisePagination({ limit: 0 }), {
      limit: DEFAULT_LIST_LIMIT,
      page: 1,
    });
    assert.deepEqual(normalisePagination({ limit: -5 }), {
      limit: DEFAULT_LIST_LIMIT,
      page: 1,
    });
  });

  test("normalisePagination clamps oversized limits", () => {
    assert.deepEqual(normalisePagination({ limit: 999 }), {
      limit: MAX_LIST_LIMIT,
      page: 1,
    });
  });

  test("normalisePagination falls back for non-numeric pages and malformed cursors", () => {
    assert.deepEqual(normalisePagination({ page: Number.NaN }), {
      limit: DEFAULT_LIST_LIMIT,
      page: 1,
    });
    assert.deepEqual(normalisePagination({ cursor: "page:-1" }), {
      limit: DEFAULT_LIST_LIMIT,
      page: 1,
    });
    assert.deepEqual(normalisePagination({ cursor: "garbage" }), {
      limit: DEFAULT_LIST_LIMIT,
      page: 1,
    });
  });

  test("paginateItems never uses a negative page window", () => {
    assert.deepEqual(paginateItems(["a", "b", "c"], { limit: 1, page: -2 }), {
      items: ["a"],
      total: 3,
      limit: 1,
      page: 1,
      nextCursor: "page:2",
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });
});

describe("management list pagination and filtering", () => {
  test("GET /api/passes searches by name or description", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/passes/route.js");
      const response = await GET(new Request("http://localhost/api/passes?search=early"));
      const body = await response.json();

      assert.equal(body.ok, true);
      assert.equal(body.data.total, 1);
      assert.equal(body.data.items[0].name, "Founder Pass");
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("GET /api/passes filters by status and paginates", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/passes/route.js");
      const response = await GET(new Request("http://localhost/api/passes?status=active&limit=2&page=1"));
      const body = await response.json();

      assert.equal(body.ok, true);
      assert.equal(body.data.total, 3);
      assert.equal(body.data.items.length, 2);
      assert.equal(body.data.hasNextPage, true);
      assert.ok(body.data.items.every((pass: any) => pass.status === "active"));
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("GET /api/members searches by name or wallet", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/members/route.js");
      const response = await GET(new Request("http://localhost/api/members?search=90F8"));
      const body = await response.json();

      assert.equal(body.ok, true);
      assert.equal(body.data.total, 1);
      assert.equal(body.data.items[0].name, "Bob");
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("GET /api/members filters by status and role", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/members/route.js");
      const response = await GET(new Request("http://localhost/api/members?status=active&role=contributor"));
      const body = await response.json();

      assert.equal(body.ok, true);
      assert.equal(body.data.total, 1);
      assert.equal(body.data.items[0].name, "Bob");
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });

  test("GET /api/members returns a clear empty paginated result", async () => {
    const previousMode = process.env.DASHBOARD_API_MODE;
    process.env.DASHBOARD_API_MODE = "mock";

    try {
      const { GET } = await import("../app/api/members/route.js");
      const response = await GET(new Request("http://localhost/api/members?search=no-such-member"));
      const body = await response.json();

      assert.equal(body.ok, true);
      assert.deepEqual(body.data.items, []);
      assert.equal(body.data.total, 0);
      assert.equal(body.data.nextCursor, null);
      assert.equal(body.data.hasNextPage, false);
    } finally {
      restoreEnv("DASHBOARD_API_MODE", previousMode);
    }
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
