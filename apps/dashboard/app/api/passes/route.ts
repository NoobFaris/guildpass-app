import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { mockPasses, type Pass } from "@/lib/mock-data";

export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    // For now, we'll use mock data while we build out the integration
    // In the future, this will use IntegrationClient with env vars
    try {
      return mockPasses as Pass[];
    } catch (error) {
      console.error("Error fetching passes:", error);
      return mockPasses as Pass[];
    }
  });
}
