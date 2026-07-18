import test from "node:test";
import assert from "node:assert";
import { HttpClient } from "../src/http/httpClient.ts";

test("HttpClient - timeout support", async () => {
  const mockFetch = async (url: string, init: any) => {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(new Response(JSON.stringify({ ok: true }))), 100);
      init.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(init.signal.reason);
      });
    });
    return new Response(JSON.stringify({ ok: true }));
  };

  const client = new HttpClient({ fetch: mockFetch as any });

  // Should succeed if timeout is longer than delay
  const res = await client.request("http://localhost", { timeout: 200 });
  assert.strictEqual(res.ok, true);

  // Should fail if timeout is shorter than delay
  await assert.rejects(
    client.request("http://localhost", { timeout: 50 }),
    (err: any) => err.message.includes("Timeout")
  );
});

test("HttpClient - retry support", async () => {
  let attempts = 0;
  const mockFetch = async () => {
    attempts++;
    if (attempts < 3) {
      return new Response("Error", { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }));
  };

  const client = new HttpClient({
    fetch: mockFetch as any,
    retry: { maxAttempts: 3, delay: 10 }
  });

  const res = await client.request("http://localhost");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(attempts, 3);
});

test("HttpClient - abort support", async () => {
  const controller = new AbortController();
  const mockFetch = async (url: string, init: any) => {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(new Response("ok")), 200);
      init.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(init.signal.reason);
      });
    });
    return new Response("ok");
  };

  const client = new HttpClient({ fetch: mockFetch as any });

  const promise = client.request("http://localhost", { signal: controller.signal });
  setTimeout(() => controller.abort("user cancel"), 50);

  await assert.rejects(promise, (err: any) => err === "user cancel");
});
