import { Client, GatewayIntentBits, Events } from "discord.js";
import { config, validateConfig } from "./config.js";
import { RoleReconciliationQueue } from "./queue.js";
import { reconcileMemberRoles, resolveDesiredRoles, type RoleMap } from "./roles.js";
import type { Membership, VerificationResult } from "@guildpass/integration-client";

// ── Integration client interface ───────────────────────────────────────────
// A minimal interface capturing the IntegrationClient methods used by the bot.
// This decouples the bot from the concrete class, making testing and DI simple.

export interface BotIntegrationClient {
  verifyWallet(
    discordUserId: string,
    wallet: string,
    options?: { signal?: AbortSignal },
  ): Promise<VerificationResult>;
  getMembershipByDiscordUser(
    discordUserId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Membership | null>;
  getMembershipByWallet(
    wallet: string,
    options?: { signal?: AbortSignal },
  ): Promise<Membership | null>;
}

// ── Intents ────────────────────────────────────────────────────────────────
// GuildMembers is required to read/manage member roles.
// Guilds is required for basic guild-aware operation.
// MessageContent is not needed since we use slash commands exclusively.

const REQUIRED_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
] as const;

// ── Role map — maps GuildPass membership roles → Discord role IDs ──────────

function buildRoleMap(): RoleMap {
  return {
    admin: config.roles.admin,
    member: config.roles.member,
    contributor: config.roles.contributor,
  };
}

// ── Client factory ─────────────────────────────────────────────────────────

export interface BotOptions {
  /** Integration client for GuildPass API calls. Defaults to a stub. */
  integration?: BotIntegrationClient;
  /** Reconciliation queue instance. Created by default if not provided. */
  queue?: RoleReconciliationQueue;
}

/**
 * Create and configure a Discord.js Client ready to be logged in.
 *
 * This is the shared entry point used by both the single-process
 * (`index.ts`) and sharded (`shard.ts`) startup paths.  The returned
 * client is NOT logged in — call `client.login(config.token)` after
 * attaching any additional listeners.
 */
export function createClient(options: BotOptions = {}): Client {
  const client = new Client({ intents: [...REQUIRED_INTENTS] });
  const integration = options.integration ?? createStubIntegrationClient();
  const queue =
    options.queue ?? new RoleReconciliationQueue();
  const roleMap = buildRoleMap();

  // ── Lifecycle events ──────────────────────────────────────────────────

  client.on(Events.ClientReady, (readyClient) => {
    const shardInfo =
      client.shard
        ? `shard #${client.shard.ids.join(",")} / ${client.shard.count}`
        : "single-process (no sharding)";

    console.log(
      `[bot] Ready — logged in as ${readyClient.user?.tag ?? "unknown"} (${shardInfo})`,
    );

    // Log guild count for observability
    console.log(`[bot] Serving ${readyClient.guilds.cache.size} guild(s)`);
  });

  // Forward shard-level lifecycle events for observability.
  // These fire when the client is managed by a ShardingManager;
  // in single-process mode they are no-ops.
  client.on(Events.ShardReady, (shardId) => {
    console.log(`[bot] Shard ${shardId} ready`);
  });
  client.on(Events.ShardReconnecting, (shardId) => {
    console.warn(`[bot] Shard ${shardId} reconnecting`);
  });
  client.on(Events.ShardDisconnect, (_closeEvent, shardId) => {
    console.warn(`[bot] Shard ${shardId} disconnected`);
  });
  client.on(Events.ShardError, (error, shardId) => {
    console.error(`[bot] Shard ${shardId} error:`, error);
  });

  // ── Slash-command handling ────────────────────────────────────────────

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
      case "verify": {
        const wallet = interaction.options.getString("wallet", true);
        await interaction.deferReply({ ephemeral: true });

        try {
          const result = await integration.verifyWallet(
            interaction.user.id,
            wallet,
          );
          if (result.verified) {
            await interaction.editReply(
              `✅ Wallet verified: \`${wallet}\``,
            );
          } else {
            await interaction.editReply(
              `❌ Verification failed: ${result.message ?? "unknown reason"}`,
            );
          }
        } catch (err) {
          console.error("[bot] /verify error:", err);
          await interaction.editReply(
            "❌ An error occurred during verification. Please try again later.",
          );
        }
        return;
      }

      case "status": {
        await interaction.deferReply({ ephemeral: true });

        try {
          const membership = await integration.getMembershipByDiscordUser(
            interaction.user.id,
          );
          if (!membership) {
            await interaction.editReply(
              "You don't have a linked GuildPass membership. Use `/verify` to link your wallet.",
            );
          } else {
            await interaction.editReply(
              `**Membership Status**\n` +
                `Wallet: \`${membership.wallet}\`\n` +
                `Status: ${membership.status}\n` +
                `Roles: ${membership.roles.join(", ") || "none"}`,
            );
          }
        } catch (err) {
          console.error("[bot] /status error:", err);
          await interaction.editReply(
            "❌ An error occurred. Please try again later.",
          );
        }
        return;
      }

      case "refresh-roles": {
        await interaction.deferReply({ ephemeral: true });

        // Enqueue the reconciliation through the rate-limit-aware queue.
        // Per-guild serialization ensures we never have two concurrent
        // reconciliations racing on the same member set.
        try {
          const result = await queue.enqueue(
            interaction.guildId ?? "unknown",
            async () => {
              const membership =
                await integration.getMembershipByDiscordUser(
                  interaction.user.id,
                );
              if (!membership) {
                return { success: false, message: "No membership found." };
              }

              const member = await interaction.guild?.members.fetch(
                interaction.user.id,
              );
              if (!member) {
                return {
                  success: false,
                  message: "Could not fetch your guild member.",
                };
              }

              const desired = resolveDesiredRoles(membership, roleMap);
              const { added, removed } = await reconcileMemberRoles(
                member,
                desired,
              );

              return {
                success: true,
                added,
                removed,
              };
            },
          );

          const res = result as {
            success: boolean;
            message?: string;
            added?: string[];
            removed?: string[];
          };

          if (!res.success) {
            await interaction.editReply(
              `⚠️ ${res.message ?? "Could not refresh roles."}`,
            );
          } else {
            const parts: string[] = ["✅ Roles refreshed!"];
            if (res.added?.length) {
              parts.push(`➕ Added: ${res.added.length} role(s)`);
            }
            if (res.removed?.length) {
              parts.push(`➖ Removed: ${res.removed.length} role(s)`);
            }
            if (!res.added?.length && !res.removed?.length) {
              parts.push("No changes needed — roles are up to date.");
            }
            await interaction.editReply(parts.join("\n"));
          }
        } catch (err) {
          console.error("[bot] /refresh-roles error:", err);
          await interaction.editReply(
            "❌ An error occurred during role refresh. Please try again later.",
          );
        }
        return;
      }

      default:
        // Unknown command — silently ignore.
        return;
    }
  });

  // ── Error resilience ──────────────────────────────────────────────────

  client.on(Events.Error, (error) => {
    console.error("[bot] Client error:", error);
  });

  client.on(Events.Warn, (warning) => {
    console.warn("[bot] Client warning:", warning);
  });

  return client;
}

// ── Stub integration client (fallback when no real client is provided) ─────

function createStubIntegrationClient(): BotIntegrationClient {
  console.warn(
    "[bot] No integration client provided — using stub. " +
      "Role reconciliation and verification will be no-ops.",
  );
  return {
    async verifyWallet(
      _discordUserId: string,
      _wallet: string,
      _options?: { signal?: AbortSignal },
    ) {
      return {
        userId: _discordUserId,
        wallet: _wallet,
        verified: false,
        message: "Stub integration — no GuildPass API connected.",
      };
    },
    async getMembershipByDiscordUser(
      _discordUserId: string,
      _options?: { signal?: AbortSignal },
    ) {
      return null;
    },
    async getMembershipByWallet(
      _wallet: string,
      _options?: { signal?: AbortSignal },
    ) {
      return null;
    },
  };
}
