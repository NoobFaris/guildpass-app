import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { mockActivity } from "@/lib/mock-data";
import { activityStorage } from "@/lib/activity/storage";

export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    try {
      // Get real activities from storage
      const realActivities = await activityStorage.getEvents();
      
      // Merge with mock data to keep the feed populated for now
      // Real activities come first (they are newer)
      const merged = [...realActivities, ...mockActivity].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return merged;
    } catch (error) {
      console.error("Error fetching activity:", error);
      return mockActivity;
    }
  });
}
