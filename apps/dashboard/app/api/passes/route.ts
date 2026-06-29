import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/api-errors";
import { mockPasses, type Pass } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getApiMode } from "@/lib/env";
import { getPassRepository } from "@/lib/repositories/factory";

/**
 * GET /api/passes
 * Accessible to all authenticated roles (passes:read).
 * Fetches from the configured repository (mock or durable).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const apiMode = getApiMode();

    if (apiMode === "live") {
      // IntegrationClient currently does not expose pass listing.
      return apiError("Pass listing in live mode is not implemented", 501);
    }

    try {
      const passRepository = getPassRepository();
      return await passRepository.getAll();
    } catch (error) {
      console.error("Error fetching passes:", error);
      // Fallback to mock data on error
      return mockPasses as Pass[];
    }
  });
}

/**
 * POST /api/passes
 * Requires passes:write permission.
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_API_SESSION, then assertPermission against it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    const body = await request.json();
    const passRepository = getPassRepository();
    return await passRepository.create(body);
  });
}

/**
 * PATCH /api/passes?id=...
 * Requires passes:write permission.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return apiError("Missing pass ID", 400);

  return handleApiError(async () => {
    const body = await request.json();
    const passRepository = getPassRepository();
    const updated = await passRepository.update(id, body);
    if (!updated) throw new NotFoundError("Pass not found.");
    return updated;
  });
}

/**
 * DELETE /api/passes?id=...
 * Requires passes:write permission.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return apiError("Missing pass ID", 400);

  return handleApiError(async () => {
    const passRepository = getPassRepository();
    const success = await passRepository.delete(id);
    if (!success) throw new NotFoundError("Pass not found.");
    return { success: true };
  });
}
