import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { mockActivity } from "@/lib/mock-data";
import { activityStorage } from "@/lib/activity/storage";
import { getActivityRepository } from "@/lib/repositories/factory";

export async function GET(): Promise<NextResponse> {
  return handleApiError(async () => {
    try {
      // Get activities from repository
      const activities = await getActivityRepository().query({});

      // Merge with activity storage events for compatibility
      const realActivities = await activityStorage.getEvents();
      
      // Combine both sources, sorted by newest first
      const merged = [...activities, ...realActivities, ...mockActivity].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Remove duplicates by id
      const seen = new Set<string>();
      return merged.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    } catch (error) {
      console.error("Error fetching activity:", error);
      return mockActivity;
    }
  });
}
