import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { mockActivity, type Activity } from "@/lib/mock-data";

export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    // For now, we'll use mock data while we build out the integration
    // In the future, this will use IntegrationClient with env vars
    try {
      return mockActivity as Activity[];
    } catch (error) {
      console.error("Error fetching activity:", error);
      return mockActivity as Activity[];
    }
  });
}
