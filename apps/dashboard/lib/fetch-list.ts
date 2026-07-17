"use client";

import type { UnsupportedResponse } from "@/lib/api-helpers";

/**
 * Result of attempting to fetch a list from a dashboard API endpoint.
 */
export type FetchListResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; code: "UNSUPPORTED_IN_LIVE_MODE"; message: string }
  | { ok: false; code: "ERROR"; message: string };

/**
 * Fetches a JSON array from `url` and interprets the response.
 *
 * - 200 + array → `{ ok: true, data }`
 * - 501 + `{ code: "UNSUPPORTED_IN_LIVE_MODE" }` → unsupported result
 * - any other failure → `{ ok: false, code: "ERROR", message }`
 */
export async function fetchList<T>(url: string): Promise<FetchListResult<T>> {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 501) {
        const body = await res.json().catch(() => ({}));
        if ((body as UnsupportedResponse).code === "UNSUPPORTED_IN_LIVE_MODE") {
          return {
            ok: false,
            code: "UNSUPPORTED_IN_LIVE_MODE",
            message: body.error || "Not implemented in live mode",
          };
        }
      }

      // Generic server error
      const body = await res.json().catch(() => ({ error: res.statusText }));
      return {
        ok: false,
        code: "ERROR",
        message: body.error || `Server returned ${res.status}`,
      };
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return { ok: true, data };
    }

    return {
      ok: false,
      code: "ERROR",
      message: "Response was not an array",
    };
  } catch (err) {
    return {
      ok: false,
      code: "ERROR",
      message: err instanceof Error ? err.message : "Unknown fetch error",
    };
  }
}
