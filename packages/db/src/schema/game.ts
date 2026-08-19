import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const gameServers = pgTable(
  "game_servers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    game: text("game").notNull().default("minecraft"),
    apiKeyHash: text("api_key_hash").notNull(),
    status: text("status").notNull().default("offline"),
    playerCount: integer("player_count").notNull().default(0),
    maxPlayers: integer("max_players").notNull().default(0),
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("game_servers_slug_idx").on(table.slug),
    index("game_servers_status_idx").on(table.status),
  ],
);

export const gameLinkCodes = pgTable(
  "game_link_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    serverId: uuid("server_id").references(() => gameServers.id, { onDelete: "cascade" }),
    playerUuid: text("player_uuid").notNull(),
    username: text("username").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("game_link_codes_code_idx").on(table.code),
    index("game_link_codes_player_uuid_idx").on(table.playerUuid),
  ],
);

export const gameCommands = pgTable(
  "game_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: uuid("server_id").references(() => gameServers.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("pending"),
    orderId: uuid("order_id"),
    fulfillmentId: uuid("fulfillment_id"),
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("game_commands_status_idx").on(table.status),
    index("game_commands_order_id_idx").on(table.orderId),
  ],
);

export const gameServersRelations = relations(gameServers, ({ many }) => ({
  linkCodes: many(gameLinkCodes),
  commands: many(gameCommands),
}));

export const gameLinkCodesRelations = relations(gameLinkCodes, ({ one }) => ({
  server: one(gameServers, { fields: [gameLinkCodes.serverId], references: [gameServers.id] }),
  user: one(users, { fields: [gameLinkCodes.userId], references: [users.id] }),
}));
