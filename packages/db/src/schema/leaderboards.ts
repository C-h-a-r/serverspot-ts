import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { userProfiles } from "./users";

export const leaderboardBoards = pgTable(
  "leaderboard_boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    game: text("game").notNull().default("minecraft"),
    statKey: text("stat_key").notNull().default("value"),
    sortDirection: text("sort_direction").notNull().default("desc"),
    displayLimit: integer("display_limit").notNull().default(10),
    resetSchedule: text("reset_schedule").notNull().default("never"),
    visible: boolean("visible").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("leaderboard_boards_slug_idx").on(table.slug)],
);

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => leaderboardBoards.id, { onDelete: "cascade" }),
    playerUuid: text("player_uuid"),
    playerName: text("player_name").notNull(),
    profileId: uuid("profile_id").references(() => userProfiles.id, { onDelete: "set null" }),
    value: numeric("value", { precision: 16, scale: 2 }).notNull(),
    rank: integer("rank").notNull().default(0),
    previousRank: integer("previous_rank"),
    delta: numeric("delta", { precision: 16, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leaderboard_entries_board_id_idx").on(table.boardId),
    uniqueIndex("leaderboard_entries_board_player_idx").on(table.boardId, table.playerName),
  ],
);

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => leaderboardBoards.id, { onDelete: "cascade" }),
    entries: jsonb("entries").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("leaderboard_snapshots_board_id_idx").on(table.boardId)],
);

export const leaderboardDataSources = pgTable(
  "leaderboard_data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => leaderboardBoards.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull().default("gateway"),
    status: text("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("leaderboard_data_sources_board_id_idx").on(table.boardId)],
);

export const leaderboardBoardsRelations = relations(leaderboardBoards, ({ many }) => ({
  entries: many(leaderboardEntries),
  snapshots: many(leaderboardSnapshots),
  dataSources: many(leaderboardDataSources),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  board: one(leaderboardBoards, {
    fields: [leaderboardEntries.boardId],
    references: [leaderboardBoards.id],
  }),
}));
