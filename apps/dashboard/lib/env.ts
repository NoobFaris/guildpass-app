export const env = {
  GUILD_PASS_CORE_URL: process.env.GUILD_PASS_CORE_URL,
  GUILD_PASS_CORE_API_KEY: process.env.GUILD_PASS_CORE_API_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  ACTIVITY_STORAGE_MODE: process.env.ACTIVITY_STORAGE_MODE,
  ACTIVITY_STORAGE_DIR: process.env.ACTIVITY_STORAGE_DIR,
  // API mode for dashboard: 'mock' (default) or 'live'
  DASHBOARD_API_MODE: process.env.DASHBOARD_API_MODE || "mock",
};

export function getApiMode(): "mock" | "live" {
  const m = env.DASHBOARD_API_MODE?.toLowerCase();
  return m === "live" ? "live" : "mock";
}

export function getEnv() {
  const {
    GUILD_PASS_CORE_URL,
    GUILD_PASS_CORE_API_KEY,
    WEBHOOK_SECRET,
    ACTIVITY_STORAGE_MODE,
    ACTIVITY_STORAGE_DIR,
  } = env;
  const mode = getApiMode();

  // Only require core URL when running in live mode
  if (mode === "live" && !GUILD_PASS_CORE_URL) {
    throw new Error("GUILD_PASS_CORE_URL is not set (required for live mode)");
  }

  return {
    GUILD_PASS_CORE_URL,
    GUILD_PASS_CORE_API_KEY,
    WEBHOOK_SECRET,
    ACTIVITY_STORAGE_MODE,
    ACTIVITY_STORAGE_DIR,
    mode,
  };
}
