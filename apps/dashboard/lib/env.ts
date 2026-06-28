export const env = {
  GUILD_PASS_CORE_URL: process.env.GUILD_PASS_CORE_URL,
  GUILD_PASS_CORE_API_KEY: process.env.GUILD_PASS_CORE_API_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  ACTIVITY_STORAGE_MODE: process.env.ACTIVITY_STORAGE_MODE,
  ACTIVITY_STORAGE_DIR: process.env.ACTIVITY_STORAGE_DIR,
  // API mode for dashboard: 'mock' (default) or 'live'
  DASHBOARD_API_MODE: process.env.DASHBOARD_API_MODE || "mock",
  // Storage mode for data persistence: 'mock' (default, in-memory) or 'durable' (backend)
  DASHBOARD_STORAGE_MODE: process.env.DASHBOARD_STORAGE_MODE || "mock",
  // Storage connection string (required when DASHBOARD_STORAGE_MODE is 'durable')
  DATABASE_URL: process.env.DATABASE_URL,
};

export function getApiMode(): "mock" | "live" {
  const m = (process.env.DASHBOARD_API_MODE || env.DASHBOARD_API_MODE)?.toLowerCase();
  return m === "live" ? "live" : "mock";
}

export function getStorageMode(): "mock" | "durable" {
  const m = (
    process.env.DASHBOARD_STORAGE_MODE || env.DASHBOARD_STORAGE_MODE
  )?.toLowerCase();
  return m === "durable" ? "durable" : "mock";
}

export interface StorageConfig {
  mode: "mock" | "durable";
  connectionString: string;
}

export function getStorageConfig(): StorageConfig {
  const mode = getStorageMode();
  const connectionString = process.env.DATABASE_URL || env.DATABASE_URL || "";

  if (mode === "durable" && !connectionString) {
    throw new Error(
      "DATABASE_URL is required when DASHBOARD_STORAGE_MODE is 'durable'"
    );
  }

  return { mode, connectionString };
}

export function getEnv() {
  const GUILD_PASS_CORE_URL =
    process.env.GUILD_PASS_CORE_URL || env.GUILD_PASS_CORE_URL;
  const GUILD_PASS_CORE_API_KEY =
    process.env.GUILD_PASS_CORE_API_KEY || env.GUILD_PASS_CORE_API_KEY;
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || env.WEBHOOK_SECRET;
  const ACTIVITY_STORAGE_MODE =
    process.env.ACTIVITY_STORAGE_MODE || env.ACTIVITY_STORAGE_MODE;
  const ACTIVITY_STORAGE_DIR =
    process.env.ACTIVITY_STORAGE_DIR || env.ACTIVITY_STORAGE_DIR;
  const apiMode = getApiMode();
  const storageMode = getStorageMode();

  // Only require core URL when running in live mode
  if (apiMode === "live" && !GUILD_PASS_CORE_URL) {
    throw new Error("GUILD_PASS_CORE_URL is not set (required for live mode)");
  }

  return {
    GUILD_PASS_CORE_URL,
    GUILD_PASS_CORE_API_KEY,
    WEBHOOK_SECRET,
    ACTIVITY_STORAGE_MODE,
    ACTIVITY_STORAGE_DIR,
    apiMode,
    storageMode,
  };
}
