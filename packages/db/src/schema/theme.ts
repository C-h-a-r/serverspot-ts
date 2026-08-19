import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { themePacks } from "./core";

export const themeFiles = pgTable(
  "theme_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    themePackId: uuid("theme_pack_id")
      .notNull()
      .references(() => themePacks.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull(),
    size: integer("size").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("theme_files_pack_path_idx").on(table.themePackId, table.path),
    index("theme_files_theme_pack_id_idx").on(table.themePackId),
  ],
);

export const uploadedAssets = pgTable(
  "uploaded_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    purpose: text("purpose").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uploaded_assets_key_idx").on(table.key),
    index("uploaded_assets_purpose_idx").on(table.purpose),
  ],
);
