import { NextResponse } from "next/server";
import {
  apiError,
  apiUnsupported,
  apiValidationError,
  handleApiError,
} from "@/lib/api-helpers";
import type { ApiFieldError } from "@/lib/api-contracts";
import { mockGuilds, type Guild } from "@/lib/mock-data";
import { requireDashboardSession, UnauthorizedError } from "@/lib/auth/server-session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";
import { getApiMode } from "@/lib/env";
import { getGuildRepository } from "@/lib/repositories/factory";

/**
 * GET /api/guilds
 * Accessible to all authenticated roles (guilds:read).
 * Fetches from the configured repository (mock or durable).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    const apiMode = getApiMode();

    if (apiMode === "live") {
      // IntegrationClient doesn't provide guild listing; require implementation in future
      return apiUnsupported(
        "guilds.list",
        apiMode,
        "Guild listing in live mode is not implemented"
      );
    }

    try {
      const guildRepository = getGuildRepository();
      return await guildRepository.getAll();
    } catch (error) {
      console.error("Error fetching guilds:", error);
      // Fallback to mock data on error
      return mockGuilds as Guild[];
    }
  });
}

/**
 * POST /api/guilds
 * Requires guilds:write permission (create a guild).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "guilds:write");
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
    const errors = validateGuildCreate(body);
    if (errors.length > 0) {
      return apiValidationError("Invalid guild payload", errors);
    }

    const guildRepository = getGuildRepository();
    return await guildRepository.create({
      name: body.name.trim(),
      description: body.description.trim(),
      memberCount: body.memberCount ?? 0,
      passCount: body.passCount ?? 0,
    });
  });
}

/**
 * PATCH /api/guilds?id=...
 * Requires guilds:write permission.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "guilds:write");
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

  if (!id) {
    return apiValidationError("Missing guild ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const body = await request.json();
    const guildRepository = getGuildRepository();
    const updated = await guildRepository.update(id, body);
    if (!updated) throw new Error("Guild not found or update failed");
    return updated;
  });
}

/**
 * DELETE /api/guilds?id=...
 * Requires guilds:write permission (remove a guild).
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const session = requireDashboardSession(request);
    assertPermission(session, "guilds:write");
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

  if (!id) {
    return apiValidationError("Missing guild ID", [
      { field: "id", message: "id query parameter is required" },
    ]);
  }

  return handleApiError(async () => {
    const guildRepository = getGuildRepository();
    const success = await guildRepository.delete(id);
    if (!success) throw new Error("Guild not found or deletion failed");
    return { success: true };
  });
}

function validateGuildCreate(body: any): ApiFieldError[] {
  const errors: ApiFieldError[] = [];

  if (typeof body?.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "name is required" });
  }

  if (
    typeof body?.description !== "string" ||
    body.description.trim().length === 0
  ) {
    errors.push({ field: "description", message: "description is required" });
  }

  if (body?.memberCount !== undefined && !Number.isInteger(body.memberCount)) {
    errors.push({ field: "memberCount", message: "memberCount must be an integer" });
  }

  if (body?.passCount !== undefined && !Number.isInteger(body.passCount)) {
    errors.push({ field: "passCount", message: "passCount must be an integer" });
  }

  return errors;
}
