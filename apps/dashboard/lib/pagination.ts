import type {
  MemberListQuery,
  PaginatedResult,
  PaginationOptions,
  PassListQuery,
} from "@/lib/repositories/types";
import type { Member, Pass } from "@/lib/mock-data";

export const DEFAULT_LIST_LIMIT = 10;
export const MAX_LIST_LIMIT = 50;

export function normalisePagination(options: PaginationOptions = {}) {
  const limit = clampPositiveInteger(options.limit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const cursorPage = decodePageCursor(options.cursor);
  const requestedPage = options.page ?? cursorPage ?? 1;
  const page = clampPositiveInteger(requestedPage, 1, Number.MAX_SAFE_INTEGER);

  return { limit, page };
}

export function paginateItems<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginatedResult<T> {
  const { limit, page } = normalisePagination(options);
  const total = items.length;
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);
  const hasNextPage = start + limit < total;

  return {
    items: pageItems,
    total,
    limit,
    page,
    nextCursor: hasNextPage ? encodePageCursor(page + 1) : null,
    hasNextPage,
    hasPreviousPage: page > 1,
  };
}

export function filterPasses(passes: Pass[], query: PassListQuery = {}): Pass[] {
  const search = normaliseSearch(query.search);
  return passes.filter((pass) => {
    const matchesSearch =
      !search ||
      pass.name.toLowerCase().includes(search) ||
      pass.description.toLowerCase().includes(search);
    const matchesStatus =
      !query.status || query.status === "all" || pass.status === query.status;

    return matchesSearch && matchesStatus;
  });
}

export function filterMembers(members: Member[], query: MemberListQuery = {}): Member[] {
  const search = normaliseSearch(query.search);
  return members.filter((member) => {
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search) ||
      member.wallet.toLowerCase().includes(search);
    const matchesStatus =
      !query.status || query.status === "all" || member.status === query.status;
    const matchesRole =
      !query.role || query.role === "all" || member.roles.includes(query.role);

    return matchesSearch && matchesStatus && matchesRole;
  });
}

export function parseListLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  return clampPositiveInteger(Number(value), DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
}

export function parseListPage(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normaliseSearch(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function clampPositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function encodePageCursor(page: number): string {
  return `page:${page}`;
}

function decodePageCursor(cursor?: string | null): number | null {
  if (!cursor) return null;
  const match = /^page:(\d+)$/.exec(cursor);
  if (!match) return null;
  return Number(match[1]);
}
