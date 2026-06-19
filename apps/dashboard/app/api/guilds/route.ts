import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { mockGuilds, type Guild } from "@/lib/mock-data";

export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    // For now, we'll use mock data while we build out the integration
    // In the future, this will use IntegrationClient with env vars
    try {
      return mockGuilds as Guild[];
    } catch (error) {
      console.error("Error fetching guilds:", error);
      return mockGuilds as Guild[];
    }
  });
}
