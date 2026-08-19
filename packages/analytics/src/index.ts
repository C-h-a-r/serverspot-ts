import type { Database } from "@serverspot/db";
import { analyticsDailyAggregates, analyticsEvents } from "@serverspot/db/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

export const trackEventSchema = z.object({
  eventType: z.string().min(1),
  module: z.string().optional(),
  userId: z.string().uuid().optional().nullable(),
  sessionId: z.string().optional(),
  path: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function trackEvent(db: Database, input: z.infer<typeof trackEventSchema>) {
  const data = trackEventSchema.parse(input);
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      eventType: data.eventType,
      module: data.module ?? null,
      userId: data.userId ?? null,
      sessionId: data.sessionId ?? null,
      path: data.path ?? null,
      metadata: data.metadata ?? {},
    })
    .returning();
  return event!;
}

export async function aggregateDailyMetrics(db: Database, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dateStr = dayStart.toISOString().slice(0, 10);

  const metrics = await db
    .select({
      eventType: analyticsEvents.eventType,
      module: analyticsEvents.module,
      count: count(),
    })
    .from(analyticsEvents)
    .where(
      and(
        gte(analyticsEvents.createdAt, dayStart),
        sql`${analyticsEvents.createdAt} < ${dayEnd}`,
      ),
    )
    .groupBy(analyticsEvents.eventType, analyticsEvents.module);

  for (const row of metrics) {
    await db
      .insert(analyticsDailyAggregates)
      .values({
        date: dateStr,
        metric: row.eventType,
        module: row.module,
        value: row.count,
      })
      .onConflictDoUpdate({
        target: [
          analyticsDailyAggregates.metric,
          analyticsDailyAggregates.date,
          analyticsDailyAggregates.module,
        ],
        set: { value: row.count },
      });
  }

  return metrics.length;
}

export async function getDailyMetrics(db: Database, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  return db
    .select()
    .from(analyticsDailyAggregates)
    .where(gte(analyticsDailyAggregates.date, sinceStr))
    .orderBy(analyticsDailyAggregates.date);
}

export async function getRecentEvents(db: Database, limit = 20) {
  return db
    .select()
    .from(analyticsEvents)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
}

export async function getAnalyticsSummary(db: Database) {
  const [eventCount] = await db.select({ count: count() }).from(analyticsEvents);
  const daily = await getDailyMetrics(db, 7);

  const pageViews = daily
    .filter((d) => d.metric === "page.view")
    .reduce((sum, d) => sum + d.value, 0);

  const registrations = daily
    .filter((d) => d.metric === "user.register")
    .reduce((sum, d) => sum + d.value, 0);

  return {
    totalEvents: eventCount?.count ?? 0,
    pageViews7d: pageViews,
    registrations7d: registrations,
    daily,
  };
}
