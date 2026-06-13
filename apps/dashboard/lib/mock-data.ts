export interface Pass {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "draft";
  price?: number;
  maxSupply?: number | null;
  currentSupply: number;
  createdAt: string;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  passCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  wallet: string;
  name: string;
  status: "active" | "inactive" | "pending";
  roles: string[];
  joinedAt: string;
  lastActive: string;
}

export interface Activity {
  id: string;
  type: "pass_created" | "pass_purchased" | "member_joined" | "role_changed" | "access_granted";
  description: string;
  timestamp: string;
  actor: string;
}

export const mockPasses: Pass[] = [
  { id: "1", name: "Founder Pass", description: "Exclusive early access pass for founding members", status: "active", price: 0.1, maxSupply: 100, currentSupply: 42, createdAt: "2025-01-15T00:00:00Z" },
  { id: "2", name: "Premium Pass", description: "Full access to all guild features", status: "active", price: 0.05, maxSupply: 500, currentSupply: 189, createdAt: "2025-02-20T00:00:00Z" },
  { id: "3", name: "Community Pass", description: "Basic community access", status: "active", price: 0, maxSupply: null, currentSupply: 1203, createdAt: "2025-01-01T00:00:00Z" },
  { id: "4", name: "VIP Pass", description: "Top-tier VIP membership", status: "draft", price: 1, maxSupply: 50, currentSupply: 0, createdAt: "2025-06-01T00:00:00Z" },
];

export const mockGuilds: Guild[] = [
  { id: "1", name: "GuildPass DAO", description: "The official GuildPass DAO", memberCount: 1434, passCount: 4, createdAt: "2024-12-01T00:00:00Z" },
  { id: "2", name: "Web3 Builders", description: "A community for Web3 developers", memberCount: 892, passCount: 3, createdAt: "2025-01-10T00:00:00Z" },
  { id: "3", name: "DeFi Enthusiasts", description: "DeFi-focused community", memberCount: 2103, passCount: 5, createdAt: "2025-03-05T00:00:00Z" },
];

export const mockMembers: Member[] = [
  { id: "1", wallet: "0x742d35Cc6634C0532925a3b8879539d43374e290", name: "Alice", status: "active", roles: ["admin", "member"], joinedAt: "2024-12-01T00:00:00Z", lastActive: "2025-06-10T12:34:56Z" },
  { id: "2", wallet: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", name: "Bob", status: "active", roles: ["member", "contributor"], joinedAt: "2025-01-05T00:00:00Z", lastActive: "2025-06-11T08:23:45Z" },
  { id: "3", wallet: "0xFFcf8Ff64036412b493244b40b914f562419246F", name: "Charlie", status: "pending", roles: [], joinedAt: "2025-06-12T00:00:00Z", lastActive: "2025-06-12T09:15:22Z" },
  { id: "4", wallet: "0x1234567890123456789012345678901234567890", name: "Diana", status: "inactive", roles: ["member"], joinedAt: "2025-02-14T00:00:00Z", lastActive: "2025-04-20T14:30:00Z" },
];

export const mockActivity: Activity[] = [
  { id: "1", type: "member_joined", description: "Alice joined GuildPass DAO", timestamp: "2025-06-11T15:30:00Z", actor: "Alice" },
  { id: "2", type: "pass_created", description: "Created new VIP Pass (draft)", timestamp: "2025-06-10T10:15:00Z", actor: "Admin" },
  { id: "3", type: "pass_purchased", description: "Bob purchased Premium Pass", timestamp: "2025-06-09T18:45:00Z", actor: "Bob" },
  { id: "4", type: "role_changed", description: "Charlie promoted to Contributor", timestamp: "2025-06-08T09:20:00Z", actor: "Admin" },
  { id: "5", type: "access_granted", description: "Alice granted Admin access", timestamp: "2025-06-07T14:00:00Z", actor: "Admin" },
];
