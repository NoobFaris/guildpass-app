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
  getSettingsRepository,
  clearRepositories,
} from "./factory";

export type {
  IRepositoryFactory,
  IPassRepository,
  IGuildRepository,
  IMemberRepository,
  IActivityRepository,
  ISettingsRepository,
} from "./types";

export { MockPassRepository, MockGuildRepository, MockMemberRepository, MockActivityRepository, MockSettingsRepository } from "./adapters/mock";

export {
  DurablePassRepository,
  DurableGuildRepository,
  DurableMemberRepository,
  DurableActivityRepository,
  DurableSettingsRepository,
} from "./adapters/durable";
