export type ActivityType = 
  | "member_joined" 
  | "membership_updated" 
  | "pass_created" 
  | "pass_updated" 
  | "pass_purchased"
  | "guild_updated" 
  | "role_changed"
  | "access_granted"
  | "verification_completed";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  actor: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  id: string;
  type: string;
  created: number;
  data: Record<string, any>;
}
