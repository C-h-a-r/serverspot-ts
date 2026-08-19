import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    module: text("module"),
    userId: uuid("user_id"),
    sessionId: text("session_id"),
    path: text("path"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analytics_events_type_idx").on(table.eventType),
    index("analytics_events_created_at_idx").on(table.createdAt),
    index("analytics_events_module_idx").on(table.module),
  ],
);

export const analyticsDailyAggregates = pgTable(
  "analytics_daily_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    metric: text("metric").notNull(),
    module: text("module"),
    value: integer("value").notNull().default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_daily_metric_date_idx").on(table.metric, table.date, table.module),
    index("analytics_daily_date_idx").on(table.date),
  ],
);
