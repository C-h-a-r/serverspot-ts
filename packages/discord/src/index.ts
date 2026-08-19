import type { Database } from "@serverspot/db";
import { discordGuildConfig, discordRoleMappings } from "@serverspot/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export type DiscordConfig = {
  botToken?: string;
  guildId?: string;
};

const DISCORD_API = "https://discord.com/api/v10";

async function discordFetch(
  config: DiscordConfig,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!config.botToken) throw new Error("Discord bot token not configured");

  return fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function sendChannelMessage(
  config: DiscordConfig,
  channelId: string,
  content: string,
) {
  const res = await discordFetch(config, `/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Discord message failed: ${res.status}`);
  return res.json();
}

export async function addGuildMemberRole(
  config: DiscordConfig,
  guildId: string,
  userId: string,
  roleId: string,
) {
  const res = await discordFetch(
    config,
    `/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT" },
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Discord role sync failed: ${res.status}`);
  }
}

export const roleMappingInputSchema = z.object({
  guildId: z.string(),
  trigger: z.enum(["order.completed", "vote.claimed", "application.accepted"]),
  roleId: z.string(),
  roleName: z.string().optional(),
});

export async function upsertRoleMapping(
  db: Database,
  input: z.infer<typeof roleMappingInputSchema>,
) {
  const data = roleMappingInputSchema.parse(input);
  const [mapping] = await db
    .insert(discordRoleMappings)
    .values(data)
    .onConflictDoUpdate({
      target: [discordRoleMappings.guildId, discordRoleMappings.trigger],
      set: { roleId: data.roleId, roleName: data.roleName ?? null },
    })
    .returning();
  return mapping!;
}

export async function getRoleMapping(
  db: Database,
  guildId: string,
  trigger: string,
) {
  const [mapping] = await db
    .select()
    .from(discordRoleMappings)
    .where(
      and(
        eq(discordRoleMappings.guildId, guildId),
        eq(discordRoleMappings.trigger, trigger),
      ),
    )
    .limit(1);
  if (!mapping || !mapping.enabled) return null;
  return mapping;
}

export async function syncRoleForTrigger(
  db: Database,
  config: DiscordConfig,
  input: { trigger: string; discordUserId: string },
) {
  const guildId = config.guildId;
  if (!guildId) return;

  const mapping = await getRoleMapping(db, guildId, input.trigger);
  if (!mapping) return;

  await addGuildMemberRole(config, mapping.guildId, input.discordUserId, mapping.roleId);
}

export async function notifyStaffChannel(
  db: Database,
  config: DiscordConfig,
  message: string,
) {
  const [guild] = await db.select().from(discordGuildConfig).limit(1);
  if (!guild?.staffChannelId) return;
  await sendChannelMessage(config, guild.staffChannelId, message);
}

export async function notifySupportChannel(
  db: Database,
  config: DiscordConfig,
  message: string,
) {
  const [guild] = await db.select().from(discordGuildConfig).limit(1);
  if (!guild?.supportChannelId) return;
  await sendChannelMessage(config, guild.supportChannelId, message);
}

export async function upsertGuildConfig(
  db: Database,
  input: {
    guildId: string;
    guildName?: string;
    staffChannelId?: string;
    supportChannelId?: string;
  },
) {
  const [config] = await db
    .insert(discordGuildConfig)
    .values(input)
    .onConflictDoUpdate({
      target: discordGuildConfig.guildId,
      set: {
        guildName: input.guildName,
        staffChannelId: input.staffChannelId,
        supportChannelId: input.supportChannelId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return config!;
}

export async function getDiscordConfig(db: Database) {
  const [guild] = await db.select().from(discordGuildConfig).limit(1);
  const mappings = await db.select().from(discordRoleMappings);
  return { guild, mappings };
}

export function isDiscordConfigured(config: DiscordConfig): boolean {
  return Boolean(config.botToken && config.guildId);
}
