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
 * ── Live mode (session-store) ──────────────────────────────────────────────
 *   Resolves the session from an Authorization: Bearer <accessToken> header.
 *   Access tokens are short-lived (15 min) and validated via HMAC signature.
 *   Stale-permission window is bounded to the access-token lifetime.
 */

import type { Session } from "./session";
import { MOCK_API_SESSION } from "./session";
import { getApiMode } from "@/lib/env";
import { cookies, headers } from "next/headers";

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

// ── Session store singleton ─────────────────────────────────────────────────

let _sessionStore: SessionStore | null = null;

/**
 * Get or create the session store singleton.
 * In mock mode this is unused; in live mode it validates and manages sessions.
 */
export function getSessionStore(): SessionStore {
  if (!_sessionStore) {
    _sessionStore = createSessionStore();
  }
  return _sessionStore;
}

/**
 * Reset the session store (for testing).
 */
export function resetSessionStore(): void {
  _sessionStore = null;
  clearSessionStore();
}

// ── Session resolution ──────────────────────────────────────────────────────

/**
 * Extract the access token from the Authorization header.
 */
function extractAccessToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Resolves the current dashboard session from the incoming `Request`.
 *
 * **Mock mode** (default, `DASHBOARD_API_MODE=mock`):
 *   Returns `MOCK_API_SESSION` for predictable local role testing.
 *   Change `MOCK_API_ROLE` in `session.ts` to simulate different roles.
 *
 * **Live mode** (`DASHBOARD_API_MODE=live`):
 *   Validates the access token from the `Authorization: Bearer <token>` header.
 *   Access tokens are short-lived (15 min) — this bounds the maximum window
 *   of stale-permission access after a role change or revocation.
 *   Throws `UnauthorizedError` if the token is missing, invalid, or expired.
 *
 * @throws {UnauthorizedError} When no valid session can be resolved.
 */
export async function getDashboardSession(request: Request): Promise<Session> {
  const mode = getApiMode();

  if (mode === "live") {
    const token = extractAccessToken(request);
    if (!token) {
      throw new UnauthorizedError(
        "Missing or invalid Authorization header. " +
          "Provide a Bearer token from the sign-in endpoint."
      );
    }

    const sessionStore = getSessionStore();
    const session = await sessionStore.validateAccessToken(token);

    if (!session) {
      throw new UnauthorizedError(
        "Access token is invalid or expired. " +
          "Refresh your session or sign in again."
      );
    }

    return session;
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
 *     const session = await requireDashboardSession(request);
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
export async function requireDashboardSession(request: Request): Promise<Session> {
  return getDashboardSession(request);
}
/**
 * Resolves the active session within Next.js Server Components or Layouts.
 *
 * Mock mode: Returns MOCK_SESSION (matching UI's MOCK_ACTIVE_ROLE).
 * Live mode: Parses incoming headers or cookies to validate real JWT/SIWE sessions.
 */
export async function getServerComponentSession(): Promise<Session> {
  const mode = getApiMode();

  if (mode === "live") {
    const cookieStore = await cookies();
    const token = cookieStore.get("guildpass_session")?.value;
    const headerList = await headers();
    const authHeader = headerList.get("authorization");

    if (!token && !authHeader) {
      throw new UnauthorizedError("No session cookie or authorization header present.");
    }

    // TODO: Wire up real validation logic here (JWT decode, next-auth session verification, etc.)
    throw new UnauthorizedError("Live Server Component session resolution is not yet implemented.");
  }

  // Fallback to the active UI mock role for clean local development workflows
  const { MOCK_SESSION } = await import("./session");
  return MOCK_SESSION;
}