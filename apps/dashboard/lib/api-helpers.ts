import { NextResponse } from "next/server";
import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiFieldError,
  ApiResult,
  ApiSuccess,
  ApiUnsupportedResponse,
  ApiValidationErrorResponse,
} from "./api-contracts";
import { isPublicApiError, ValidationError } from "@/lib/api-errors";

export function apiResponse<T>(
  data: T,
  init?: ResponseInit
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Build a JSON error response. `errorId` is included when present so a client
 * can quote it in a bug report and an operator can grep the server logs for the
 * matching entry.
 */
export function apiError(
  message: string,
  status: number = 500,
  code: ApiErrorCode = inferErrorCode(status),
  errorId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { ok: false, code, error: message, ...(errorId ? { errorId } : {}) },
    { status }
  );
}

export function apiValidationError(
  message: string,
  fields: ApiFieldError[],
  status: number = 400
): NextResponse<ApiValidationErrorResponse> {
  return NextResponse.json(
    { ok: false, code: "VALIDATION_ERROR", error: message, fields },
    { status }
  );
}

export function apiUnsupported(
  feature: string,
  mode: string,
  message: string
): NextResponse<ApiUnsupportedResponse> {
  return NextResponse.json(
    {
      ok: false,
      code: "UNSUPPORTED",
      error: message,
      unsupported: { feature, mode },
    },
    { status: 501 }
  );
}

/**
 * Generate a short correlation id for an internal error. Used to tie a generic
 * client-facing 500 back to the full detail captured in the server logs.
 */
function newErrorId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `err_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
  );
}

/**
 * Returns a 501 response indicating that this endpoint is not available in live mode.
 * The client-side code checks for the `code` field to distinguish unsupported live
 * operations from transient errors, so it can show an appropriate UI instead of
 * silently falling back to mock data.
 */
export function apiUnsupported(
  message: string
): NextResponse<UnsupportedResponse> {
  return NextResponse.json(
    { error: message, code: "UNSUPPORTED_IN_LIVE_MODE" },
    { status: 501 }
  );
}

export async function handleApiError<T>(
  fn: () => Promise<T | NextResponse>
): Promise<NextResponse<ApiResult<T>>> {
  try {
    const data = await fn();
    if (data instanceof Response) {
      return data as NextResponse<ApiResult<T>>;
    }

    return apiResponse(data);
  } catch (err) {
    // Expected, client-safe errors (validation, permission, not-found) carry
    // their own status and an intentional message — surface them as-is.
    if (isPublicApiError(err)) {
      if (err instanceof ValidationError && err.fields) {
        return apiValidationError(err.message, err.fields, err.statusCode);
      }
      return apiError(err.message, err.statusCode);
    }

    // Anything else is an unexpected internal failure. Log the full detail with
    // a correlation id, but never return the raw message to the client.
    const errorId = newErrorId();
    console.error(`API Error [${errorId}]:`, err);
    return apiError("An unexpected error occurred", 500, "SERVER_ERROR", errorId);
  }
}

function inferErrorCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 502) return "UPSTREAM_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "BAD_REQUEST";
}
