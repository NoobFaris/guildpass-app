/**
 * lib/auth/server-session.ts
 *
 * Server-side session resolution abstraction for API route handlers.
 *
 * API routes call `requireDashboardSession(request)` instead of importing
 * `MOCK_API_SESSION` directly. This decouples route handler logic from the
 * session source and creates the boundary needed to add real authentication
 * (cookies, JWTs, SIWE sessions, etc.) later without touching every route.
 *
 * ── Current behaviour (mock mode) ───────────────────────────────────────────
 *   Returns MOCK_API_SESSION — the pre-configured mock session.
 *   Switch MOCK_API_ROLE in session.ts to test different permission levels.
 *
 * ── Future behaviour (live mode) ────────────────────────────────────────────
 *   Validate the incoming request's cookies / Authorization header / SIWE
 *   payload and return a real Session object. Until that implementation is
 *   wired up, live mode throws UnauthorizedError.
 */

import type { Session } from "./session";
import { MOCK_API_SESSION } from "./session";
import { getApiMode } from "@/lib/env";

// ── Error types ──────────────────────────────────────────────────────────────

/**
 * Thrown when no valid session can be resolved from the request.
 * API routes should catch this and return a 401 response.
 */
export class UnauthorizedError extends Error {
  readonly statusCode = 401;

  constructor(message = "Unauthorized: no valid session") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// ── Session resolution ──────────────────────────────────────────────────────

/**
 * Resolves the current dashboard session from the incoming `Request`.
 *
 * **Mock mode** (default, `DASHBOARD_API_MODE=mock`):
 *   Returns `MOCK_API_SESSION` for predictable local role testing.
 *   Change `MOCK_API_ROLE` in `session.ts` to simulate different roles.
 *
 * **Live mode** (`DASHBOARD_API_MODE=live`):
 *   Throws `UnauthorizedError` — real session resolution is not yet implemented.
 *   Wire this up to your auth provider (next-auth, JWT decode, SIWE, etc.)
 *   when ready.
 *
 * @throws {UnauthorizedError} When no valid session can be resolved.
 */
export function getDashboardSession(_request: Request): Session {
  const mode = getApiMode();

  if (mode === "live") {
    // TODO: Implement real session resolution from request headers/cookies/JWT.
    //
    // Example approaches:
    //   - next-auth:  const session = await getServerSession(authOptions);
    //   - JWT cookie: decode the session cookie from request headers
    //   - SIWE:       validate SIWE signature from Authorization header
    //
    // Until implemented, reject with a clear error.
    throw new UnauthorizedError(
      "Live session resolution is not yet implemented. " +
        "Set DASHBOARD_API_MODE=mock for local development."
    );
  }

  // Mock mode — return the pre-configured mock API session.
  // This keeps local development and testing fully functional.
  return MOCK_API_SESSION;
}

/**
 * Like `getDashboardSession`, but semantically asserts that the caller
 * requires a valid session. Throws `UnauthorizedError` if resolution fails.
 *
 * This is the primary function API route handlers should use before
 * proceeding with permission checks.
 *
 * @example
 * ```ts
 * import { requireDashboardSession, UnauthorizedError } from "@/lib/auth/server-session";
 * import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
 *
 * export async function POST(request: Request) {
 *   try {
 *     const session = requireDashboardSession(request);
 *     assertPermission(session, "passes:write");
 *   } catch (err) {
 *     if (err instanceof PermissionDeniedError) return apiError(err.message, 403);
 *     if (err instanceof UnauthorizedError)    return apiError(err.message, 401);
 *     throw err;
 *   }
 *   // ... handle the mutation
 * }
 * ```
 */
export function requireDashboardSession(request: Request): Session {
  return getDashboardSession(request);
}
