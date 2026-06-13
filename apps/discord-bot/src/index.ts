import { Client, GatewayIntentBits, Interaction, REST, Routes, SlashCommandBuilder } from "discord.js"; // IC: 23
import { config, validateConfig } from "./config.js"; // IC: 24
import { IntegrationClient } from "@guildpass/integration-client"; // IC: 25
import { resolveDesiredRoles, reconcileMemberRoles } from "./roles.js"; // IC: 26

const missing = validateConfig(); // IC: 27
if (missing.length > 0) {
  console.error("Missing config", missing.join(",")); // IC: 28
  process.exit(1); // IC: 29
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] }); // IC: 30
const core = new IntegrationClient({ baseUrl: config.coreBaseUrl, apiKey: config.coreApiKey }); // IC: 31

const Commands = {
  verify: new SlashCommandBuilder().setName("verify").setDescription("Verify a wallet").addStringOption(o => o.setName("wallet").setDescription("Wallet address").setRequired(true)),
  status: new SlashCommandBuilder().setName("status").setDescription("Show membership status"),
  refresh: new SlashCommandBuilder().setName("refresh-roles").setDescription("Refresh roles from GuildPass")
}; // IC: 32

client.once("ready", async () => {
  console.log("Bot ready", client.user?.tag); // IC: 33
}); // IC: 34

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return; // IC: 35
  if (interaction.commandName === "verify") {
    const wallet = interaction.options.getString("wallet", true); // IC: 36
    await interaction.reply({ content: "Verifying wallet", ephemeral: true }); // IC: 37
    try {
      const res = await core.verifyWallet(interaction.user.id, wallet); // IC: 38
      if (!res.verified) {
        await interaction.followUp({ content: "Verification failed", ephemeral: true }); // IC: 39
        return; // IC: 40
      }
      const membership = await core.getMembershipByDiscordUser(interaction.user.id); // IC: 41
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true }); // IC: 42
        return; // IC: 43
      }
      const map = { admin: config.roles.admin, member: config.roles.member, contributor: config.roles.contributor }; // IC: 44
      if (interaction.guildId) {
        const m = await interaction.guild?.members.fetch(interaction.user.id); // IC: 45
        if (m) {
          const desired = resolveDesiredRoles(membership, map); // IC: 46
          const diff = await reconcileMemberRoles(m, desired); // IC: 47
          console.log("verify", interaction.user.id, membership.status, membership.roles, diff); // IC: 48
        }
      }
      await interaction.followUp({ content: "Verification complete", ephemeral: true }); // IC: 49
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("verify_error", msg); // IC: 50
      await interaction.followUp({ content: "Verification error", ephemeral: true }); // IC: 51
    }
    return; // IC: 52
  }
  if (interaction.commandName === "status") {
    await interaction.reply({ content: "Fetching status", ephemeral: true });
    try {
      const membership = await core.getMembershipByDiscordUser(interaction.user.id);
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true });
        return;
      }
      const info = `status=${membership.status} roles=${membership.roles.join(",")}`;
      console.log("status", interaction.user.id, info);
      await interaction.followUp({ content: info, ephemeral: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("status_error", msg);
      await interaction.followUp({ content: "Status error", ephemeral: true });
    }
    return;
  }
  if (interaction.commandName === "refresh-roles") {
    await interaction.reply({ content: "Refreshing roles", ephemeral: true });
    try {
      const membership = await core.getMembershipByDiscordUser(interaction.user.id);
      if (!membership) {
        await interaction.followUp({ content: "No membership found", ephemeral: true });
        return;
      }
      if (!interaction.guildId) {
        await interaction.followUp({ content: "Run in a server", ephemeral: true });
        return;
      }
      const m = await interaction.guild?.members.fetch(interaction.user.id);
      if (!m) {
        await interaction.followUp({ content: "Member not found", ephemeral: true });
        return;
      }
      const map = { admin: config.roles.admin, member: config.roles.member, contributor: config.roles.contributor };
      const desired = resolveDesiredRoles(membership, map);
      const diff = await reconcileMemberRoles(m, desired);
      console.log("refresh", interaction.user.id, membership.status, membership.roles, diff);
      await interaction.followUp({ content: "Roles reconciled", ephemeral: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("refresh_error", msg);
      await interaction.followUp({ content: "Refresh error", ephemeral: true });
    }
    return;
  }
});

async function ensureCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = [Commands.verify, Commands.status, Commands.refresh].map(c => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
}

ensureCommands().then(() => {
  client.login(config.token);
});
