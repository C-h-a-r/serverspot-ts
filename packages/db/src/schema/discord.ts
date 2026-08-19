import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const discordGuildConfig = pgTable(
  "discord_guild_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: text("guild_id").notNull(),
    guildName: text("guild_name"),
    staffChannelId: text("staff_channel_id"),
    supportChannelId: text("support_channel_id"),
    enabled: boolean("enabled").notNull().default(true),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("discord_guild_config_guild_id_idx").on(table.guildId)],
);

export const discordRoleMappings = pgTable(
  "discord_role_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: text("guild_id").notNull(),
    trigger: text("trigger").notNull(),
    roleId: text("role_id").notNull(),
    roleName: text("role_name"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("discord_role_mappings_guild_trigger_idx").on(table.guildId, table.trigger),
  ],
);
