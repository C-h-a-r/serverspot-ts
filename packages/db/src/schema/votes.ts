import { relations } from "drizzle-orm";
import {
  boolean,
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

export const voteSites = pgTable(
  "vote_sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    voteUrl: text("vote_url").notNull(),
    callbackMethod: text("callback_method").notNull().default("token"),
    secret: text("secret"),
    enabled: boolean("enabled").notNull().default(true),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(1440),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("vote_sites_slug_idx").on(table.slug)],
);

export const voteCallbacks = pgTable(
  "vote_callbacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => voteSites.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    playerUuid: text("player_uuid"),
    ipAddress: text("ip_address"),
    verified: boolean("verified").notNull().default(false),
    rawPayload: jsonb("raw_payload").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vote_callbacks_site_id_idx").on(table.siteId),
    index("vote_callbacks_username_idx").on(table.username),
  ],
);

export const votePendingClaims = pgTable(
  "vote_pending_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => voteSites.id, { onDelete: "cascade" }),
    callbackId: uuid("callback_id").references(() => voteCallbacks.id, { onDelete: "set null" }),
    username: text("username").notNull(),
    claimToken: text("claim_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vote_pending_claims_token_idx").on(table.claimToken),
    index("vote_pending_claims_username_idx").on(table.username),
  ],
);

export const voteClaims = pgTable(
  "vote_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => voteSites.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    username: text("username").notNull(),
    rewardType: text("reward_type").notNull().default("command"),
    rewardPayload: jsonb("reward_payload").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vote_claims_user_id_idx").on(table.userId)],
);

export const voteRewards = pgTable(
  "vote_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").references(() => voteSites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rewardType: text("reward_type").notNull().default("command"),
    payload: jsonb("payload").notNull().default({}),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vote_rewards_site_id_idx").on(table.siteId)],
);

export const voteStreaks = pgTable(
  "vote_streaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastVoteAt: timestamp("last_vote_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("vote_streaks_username_idx").on(table.username)],
);

export const voteSitesRelations = relations(voteSites, ({ many }) => ({
  callbacks: many(voteCallbacks),
  pendingClaims: many(votePendingClaims),
  rewards: many(voteRewards),
}));
