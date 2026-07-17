import type { Member } from "./mock-data";

const MEMBER_CSV_HEADERS = ["Name", "Wallet", "Status", "Roles", "Joined At", "Last Active"];

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function toMembersCsv(members: Member[]): string {
  const rows = members.map((member) => [
    member.name,
    member.wallet,
    member.status,
    (member.roles ?? []).join("; "),
    member.joinedAt,
    member.lastActive,
  ]);

  return [MEMBER_CSV_HEADERS, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\r\n");
}
