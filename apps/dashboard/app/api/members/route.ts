import { NextResponse } from "next/server";
import { handleApiError, apiError } from "@/lib/api-helpers";
import { mockMembers, type Member } from "@/lib/mock-data";
import { MOCK_API_SESSION } from "@/lib/auth/session";
import { assertPermission, PermissionDeniedError } from "@/lib/permissions";

/**
 * GET /api/members
 * Accessible to all authenticated roles (members:read).
 */
export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    try {
      return mockMembers as Member[];
    } catch (error) {
      console.error("Error fetching members:", error);
      return mockMembers as Member[];
    }
  });
}

/**
 * POST /api/members
 * Requires members:write permission (invite / create a member).
 *
 * ⚠️  In production, resolve the session from the request (JWT / cookie)
 *     instead of using MOCK_SESSION, then assertPermission against it.
 */
export async function POST(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement member invitation / creation logic
    return { message: "Member invited (stub)" };
  });
}

/**
 * DELETE /api/members
 * Requires members:write permission (remove a member).
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    assertPermission(MOCK_API_SESSION, "members:write");
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return apiError(err.message, 403);
    }
    throw err;
  }

  return handleApiError(async () => {
    // TODO: implement member removal logic
    return { message: "Member removed (stub)" };
  });
}
