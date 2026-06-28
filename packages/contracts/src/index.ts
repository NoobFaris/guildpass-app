/**
 * Mock Membership ABI for indexing
 */
export const MEMBERSHIP_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "member", type: "address" },
      { indexed: true, name: "passId", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ],
    name: "MembershipCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "member", type: "address" },
      { indexed: true, name: "passId", type: "uint256" },
      { indexed: false, name: "newStatus", type: "uint8" }
    ],
    name: "MembershipUpdated",
    type: "event"
  }
] as const;

export const MEMBERSHIP_EVENTS = {
  MembershipCreated: "MembershipCreated",
  MembershipUpdated: "MembershipUpdated"
} as const;
