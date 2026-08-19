import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    banner: text("banner"),
    avatar: text("avatar"),
    playtime: integer("playtime").default(0),
    joinDate: timestamp("join_date", { withTimezone: true }),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    privacy: text("privacy").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_profiles_user_id_idx").on(table.userId),
    uniqueIndex("user_profiles_slug_idx").on(table.slug),
    index("user_profiles_privacy_idx").on(table.privacy),
  ],
);

export const userLinkedAccounts = pgTable(
  "user_linked_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    username: text("username").notNull(),
    uuid: text("uuid"),
    verified: boolean("verified").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_linked_accounts_user_id_idx").on(table.userId)],
);

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
  linkedAccounts: many(userLinkedAccounts),
}));

export const userLinkedAccountsRelations = relations(userLinkedAccounts, ({ one }) => ({
  user: one(users, { fields: [userLinkedAccounts.userId], references: [users.id] }),
}));
