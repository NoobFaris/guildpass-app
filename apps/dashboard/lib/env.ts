export const env = {
  GUILD_PASS_CORE_URL: process.env.GUILD_PASS_CORE_URL,
  GUILD_PASS_CORE_API_KEY: process.env.GUILD_PASS_CORE_API_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
};

export function getEnv() {
  const { GUILD_PASS_CORE_URL, GUILD_PASS_CORE_API_KEY, WEBHOOK_SECRET } = env;
  
  if (!GUILD_PASS_CORE_URL) {
    throw new Error("GUILD_PASS_CORE_URL is not set");
  }

  return {
    GUILD_PASS_CORE_URL,
    GUILD_PASS_CORE_API_KEY,
    WEBHOOK_SECRET,
  };
}
