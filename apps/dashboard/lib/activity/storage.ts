import { ActivityEvent } from "./types";
import { mockActivity } from "../mock-data";

/**
 * Interface for activity storage. 
 * Allows swapping in-memory with database later.
 */
export interface IActivityStorage {
  addEvent(event: ActivityEvent): Promise<void>;
  getEvents(limit?: number): Promise<ActivityEvent[]>;
  isDuplicate(eventId: string): Promise<boolean>;
}

/**
 * In-memory implementation of activity storage.
 * Note: This will reset on server restart.
 */
class InMemoryActivityStorage implements IActivityStorage {
  private events: ActivityEvent[] = [];
  private processedIds = new Set<string>();

  constructor() {
    // Seed with mock data if needed, or start empty
    // For now, let's keep it separate from the existing mock-data.ts 
    // to avoid confusion between static mocks and dynamic ingestion.
  }

  async addEvent(event: ActivityEvent): Promise<void> {
    if (this.processedIds.has(event.id)) {
      return;
    }
    
    this.events.unshift(event);
    this.processedIds.add(event.id);
    
    // Keep a reasonable limit in memory
    if (this.events.length > 1000) {
      const removed = this.events.pop();
      if (removed) this.processedIds.delete(removed.id);
    }
  }

  async getEvents(limit?: number): Promise<ActivityEvent[]> {
    return limit ? this.events.slice(0, limit) : [...this.events];
  }

  async isDuplicate(eventId: string): Promise<boolean> {
    return this.processedIds.has(eventId);
  }
}

// Global instance for the dashboard app
export const activityStorage = new InMemoryActivityStorage();
