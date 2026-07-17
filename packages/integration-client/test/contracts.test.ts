import test from "node:test";
import assert from "node:assert";
import { IntegrationClient } from "../src/client.ts";

test("ContractClient - transport inheritance and call", async () => {
  let callOptions: any;
  const mockFetch = async (url: string, options: any) => {
    callOptions = options;
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: JSON.parse(options.body).id,
      result: "0x123"
    }));
  };

  const client = new IntegrationClient({
    baseUrl: "http://api",
    transport: {
      fetch: mockFetch as any,
      timeout: 5000
    }
  });

  const contract = client.getContractClient("http://rpc");
  const result = await contract.call("eth_blockNumber", []);

  assert.strictEqual(result, "0x123");
  assert.strictEqual(callOptions.method, "POST");
});

test("ContractClient - retry on transient RPC errors (HTTP 500)", async () => {
  let attempts = 0;
  const mockFetch = async () => {
    attempts++;
    if (attempts < 2) {
      return new Response("Error", { status: 503 });
    }
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: "ok"
    }));
  };

  const client = new IntegrationClient({
    baseUrl: "http://api",
    transport: {
      fetch: mockFetch as any,
      retry: { maxAttempts: 2, delay: 10 }
    }
  });

  const contract = client.getContractClient("http://rpc");
  const result = await contract.call("test", []);
  assert.strictEqual(result, "ok");
  assert.strictEqual(attempts, 2);
});
