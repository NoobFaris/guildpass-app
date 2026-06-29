import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  clearRepositories,
  getMemberRepository,
  getPassRepository,
} from "../lib/repositories/factory";
import {
  PATCH as PATCH_MEMBER,
  POST as POST_MEMBER,
} from "../app/api/members/route";
import {
  PATCH as PATCH_PASS,
  POST as POST_PASS,
} from "../app/api/passes/route";

process.env.DASHBOARD_API_MODE = "mock";
process.env.DASHBOARD_STORAGE_MODE = "mock";

const VALID_WALLET = "0x742d35Cc6634C0532925a3b8879539d43374e290";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function errorFields(response: Response): Promise<string[]> {
  const body = await response.json();
  return body.errors.map((error: { field: string }) => error.field);
}

beforeEach(() => {
  clearRepositories();
});

describe("pass mutation validation", () => {
  test("POST /api/passes accepts valid payloads in mock mode", async () => {
    const response = await POST_PASS(
      jsonRequest("https://example.test/api/passes", {
        name: "Season Pass",
        description: "Access for this season",
        price: 0.25,
        maxSupply: 100,
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.name, "Season Pass");
    assert.equal(body.status, "draft");
    assert.equal(body.currentSupply, 0);
    assert.ok(body.id);
    assert.ok(body.createdAt);
  });

  test("POST /api/passes returns field errors for missing required fields", async () => {
    const response = await POST_PASS(
      jsonRequest("https://example.test/api/passes", {
        description: "",
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["name", "description"]);
  });

  test("PATCH /api/passes rejects invalid status and supply values", async () => {
    const pass = await getPassRepository().create({
      name: "Patch Target",
      description: "Patch target",
      status: "draft",
      currentSupply: 0,
    });

    const response = await PATCH_PASS(
      jsonRequest(`https://example.test/api/passes?id=${pass.id}`, {
        status: "archived",
        currentSupply: -1,
        maxSupply: 1.5,
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), [
      "maxSupply",
      "currentSupply",
      "status",
    ]);
  });

  test("POST /api/passes rejects malformed payloads", async () => {
    const response = await POST_PASS(
      new Request("https://example.test/api/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["body"]);
  });

  test("PATCH /api/passes rejects server-owned fields", async () => {
    const pass = await getPassRepository().create({
      name: "Server Owned",
      description: "Server owned",
      status: "draft",
      currentSupply: 0,
    });

    const response = await PATCH_PASS(
      jsonRequest(`https://example.test/api/passes?id=${pass.id}`, {
        id: "client-id",
        createdAt: "2020-01-01T00:00:00.000Z",
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["id", "createdAt"]);
  });
});

describe("member mutation validation", () => {
  test("POST /api/members accepts valid payloads in mock mode", async () => {
    const response = await POST_MEMBER(
      jsonRequest("https://example.test/api/members", {
        name: "Ada",
        wallet: VALID_WALLET,
        roles: ["member", "contributor"],
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.name, "Ada");
    assert.equal(body.wallet, VALID_WALLET);
    assert.equal(body.status, "pending");
    assert.deepEqual(body.roles, ["member", "contributor"]);
    assert.ok(body.id);
    assert.ok(body.joinedAt);
    assert.ok(body.lastActive);
  });

  test("POST /api/members returns field errors for missing required fields", async () => {
    const response = await POST_MEMBER(
      jsonRequest("https://example.test/api/members", {
        roles: [],
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["name", "wallet"]);
  });

  test("PATCH /api/members rejects invalid wallet, status, roles, and dates", async () => {
    const member = await getMemberRepository().create({
      name: "Patch Member",
      wallet: VALID_WALLET,
      status: "pending",
      roles: ["member"],
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    const response = await PATCH_MEMBER(
      jsonRequest(`https://example.test/api/members?id=${member.id}`, {
        wallet: "0xnot-a-wallet",
        status: "banned",
        roles: ["owner"],
        joinedAt: "not-a-date",
        lastActive: 123,
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), [
      "wallet",
      "roles.0",
      "joinedAt",
      "lastActive",
      "status",
    ]);
  });

  test("POST /api/members rejects malformed payloads", async () => {
    const response = await POST_MEMBER(
      new Request("https://example.test/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "[",
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["body"]);
  });

  test("PATCH /api/members rejects server-owned fields", async () => {
    const member = await getMemberRepository().create({
      name: "Server Owned Member",
      wallet: VALID_WALLET,
      status: "pending",
      roles: ["member"],
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    const response = await PATCH_MEMBER(
      jsonRequest(`https://example.test/api/members?id=${member.id}`, {
        id: "client-id",
        createdAt: "2020-01-01T00:00:00.000Z",
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await errorFields(response), ["id", "createdAt"]);
  });
});
