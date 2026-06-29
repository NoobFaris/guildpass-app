import { NextResponse } from "next/server";
import { handleApiError, apiError, apiUnsupported } from "@/lib/api-helpers";
import { mockPasses, type Pass } from "@/lib/mock-data";
import { requireDashboardSession, UnauthorizedError } from "@/lib/auth/server-session";
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
      return apiUnsupported("Pass listing in live mode is not implemented");
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
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    if (err instanceof UnauthorizedError) {
      return apiError(err.message, 401);
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
    const session = requireDashboardSession(request);
    assertPermission(session, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    if (err instanceof UnauthorizedError) {
      return apiError(err.message, 401);
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
    if (!updated) throw new Error("Pass not found or update failed");
    return updated;
  });
}

/**
 * DELETE /api/passes?id=...
 * Requires passes:write permission.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "passes:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    if (err instanceof UnauthorizedError) {
      return apiError(err.message, 401);
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return apiError("Missing pass ID", 400);

  return handleApiError(async () => {
    const passRepository = getPassRepository();
    const success = await passRepository.delete(id);
    if (!success) throw new Error("Pass not found or deletion failed");
    return { success: true };
  });
}
