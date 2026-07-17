# @guildpass/integration-client

Typed client for the GuildPass core API, built for integrations that need to
look up guild memberships and verify wallet ownership without reading the
source. It also exposes a thin JSON-RPC client for on-chain reads through the
same transport.

- Package: `@guildpass/integration-client`
- Runtime: Node.js >= 18.17 (uses the global `fetch`)
- Exports: `IntegrationClient`, `ContractClient`, and the types
  `Membership`, `VerificationResult`, `IntegrationClientOptions`,
  `TransportConfig`, `RetryConfig`, `HttpRequestOptions`, plus the contract
  types `JsonRpcRequest`, `JsonRpcResponse`, `ContractCallOptions`.

## Install

```bash
npm install @guildpass/integration-client
```

## Quick start

This mirrors the real usage in
[`apps/dashboard/app/api/verify/route.ts`](../../apps/dashboard/app/api/verify/route.ts):

```ts
import { IntegrationClient, type VerificationResult } from "@guildpass/integration-client";

const client = new IntegrationClient({
  baseUrl: process.env.GUILD_PASS_CORE_URL!, // core API base URL
  apiKey: process.env.GUILD_PASS_API_KEY,    // bearer token (optional)
});

// Verify a Discord user controls a wallet
const result: VerificationResult = await client.verifyWallet(discordUserId, wallet);
// => { userId, wallet, verified, message? }

if (result.verified) {
  // grant access
}
```

### Membership lookups

```ts
// By Discord user id (null if the user has no membership)
const byDiscord = await client.getMembershipByDiscordUser(discordUserId);

// By wallet address (null if the wallet has no membership)
const byWallet = await client.getMembershipByWallet(wallet);

if (byWallet) {
  console.log(byWallet.status); // "active" | "inactive" | "unknown"
  console.log(byWallet.roles);  // RoleKey[]: "admin" | "member" | "contributor"
}
```

A membership lookup throws `Error("core:<status>")` on any non-404 error
response. `404` is treated as "no membership" and returns `null`.

### On-chain reads (ContractClient)

```ts
const contract = client.getContractClient("https://your-rpc.example/v1");

// Raw JSON-RPC call; `call<T>` is generic over the result type.
const owner: string = await contract.call<string>("ownerOf", [tokenId]);
```

`ContractClient.call` throws `Error("RPC_HTTP_ERROR:<status>")` on a
non-OK HTTP response and `Error("RPC_ERROR:<code> <message>")` when the
JSON-RPC payload carries an `error` object.

## API reference

### `new IntegrationClient(options)`

| Option      | Type                                            | Required | Description                                                                 |
| ----------- | ----------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `baseUrl`   | `string`                                        | yes      | Core API base URL. Trailing slashes are stripped.                           |
| `apiKey`    | `string`                                         | no       | Bearer token sent as `Authorization: Bearer <apiKey>`. Omit for public endpoints. |
| `transport` | [`TransportConfig`](#transportconfig)           | no       | Default `fetch` implementation, timeout, and retry behaviour.               |

### Methods

| Method                                            | Returns                  | Throws on error            |
| ------------------------------------------------- | ------------------------ | -------------------------- |
| `getContractClient(rpcUrl)`                       | `ContractClient`         | —                          |
| `getMembershipByDiscordUser(discordUserId, opts?)`| `Membership \| null`     | `core:<status>` (non-404)  |
| `getMembershipByWallet(wallet, opts?)`            | `Membership \| null`     | `core:<status>` (non-404)  |
| `verifyWallet(discordUserId, wallet, opts?)`      | `VerificationResult`     | `core:<status>`            |

Every method accepts an optional per-request
[`HttpRequestOptions`](#httprequestoptions) as its last argument.

## Transport: timeout, retry & backoff

All requests flow through an internal `HttpClient`. Retry and timeout can be
configured **per request** (via `HttpRequestOptions`) or as **client defaults**
(via `IntegrationClientOptions.transport`). A per-request value always wins
over the client default.

### `TransportConfig` (client defaults)

| Field      | Type                              | Default                                  |
| ---------- | --------------------------------- | ---------------------------------------- |
| `fetch`    | `typeof fetch`                    | global `fetch`                           |
| `timeout`  | `number` (ms)                     | **unset — no timeout** unless provided   |
| `retry`    | [`RetryConfig`](#retryconfig)     | **unset — single attempt (no retry)**    |

### `RetryConfig`

| Field         | Type      | Default                              |
| ------------- | --------- | ------------------------------------ |
| `maxAttempts` | `number`  | **no default** — omit `retry` and the request is attempted **once** |
| `delay`       | `number`  | **1000 ms** between attempts         |
| `backoff`     | `boolean` | **false** (fixed delay). When `true`, delay grows as `delay * 2^(attempt-1)` (exponential backoff) |

**Retry semantics:**

- Only **transient** failures are retried: HTTP `429` (rate limited) and any
  `5xx` status. `4xx` responses (other than `429`) are returned/throw
  immediately — they are not retried.
- A request is retried up to `maxAttempts - 1` times (so `maxAttempts: 3`
  means the original attempt plus two retries).
- Network errors are retried up to `maxAttempts`; on the final failed attempt
  the original error is re-thrown.
- If neither `retry` nor `maxAttempts` is supplied, the request is sent once
  and never retried.

### Examples

```ts
// Client-wide: 5s timeout, retry up to 3 times with exponential backoff.
const client = new IntegrationClient({
  baseUrl: process.env.GUILD_PASS_CORE_URL!,
  apiKey: process.env.GUILD_PASS_API_KEY,
  transport: {
    timeout: 5000,
    retry: { maxAttempts: 3, delay: 500, backoff: true },
  },
});

// Override per request: this one call gets a longer timeout, no retry.
const m = await client.getMembershipByWallet(wallet, {
  timeout: 10000,
  retry: { maxAttempts: 1 },
});
```

### Aborting a request

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 3000);

try {
  await client.getMembershipByDiscordUser(userId, { signal: controller.signal });
} catch (err) {
  // AbortError (or the abort reason) is propagated
}
```

## Types

```ts
type Membership = {
  userId: string;
  wallet?: string;
  status: "active" | "inactive" | "unknown";
  roles: ("admin" | "member" | "contributor")[];
  updatedAt: string; // ISO timestamp
};

type VerificationResult = {
  userId: string;
  wallet: string;
  verified: boolean;
  message?: string;
};
```

The full set of exported types (including the `ActivityEvent` audit model and
the contract JSON-RPC types) is available from the package root:

```ts
import type {
  Membership,
  VerificationResult,
  IntegrationClientOptions,
  TransportConfig,
  RetryConfig,
  HttpRequestOptions,
  JsonRpcRequest,
  JsonRpcResponse,
  ContractCallOptions,
} from "@guildpass/integration-client";
```

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # emit to dist/
npm run lint        # eslint
```
