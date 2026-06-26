/**
 * Repository module entry point.
 * Clean API for repository access across the dashboard.
 */

export {
  getRepositoryFactory,
  getPassRepository,
  getGuildRepository,
  getMemberRepository,
  getActivityRepository,
  clearRepositories,
} from "./factory";

export type {
  IRepositoryFactory,
  IPassRepository,
  IGuildRepository,
  IMemberRepository,
  IActivityRepository,
} from "./types";

export { MockPassRepository, MockGuildRepository, MockMemberRepository, MockActivityRepository } from "./adapters/mock";

export {
  DurablePassRepository,
  DurableGuildRepository,
  DurableMemberRepository,
  DurableActivityRepository,
} from "./adapters/durable";
