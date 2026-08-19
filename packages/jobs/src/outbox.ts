import type { Database } from "@serverspot/db";
import { jobOutbox } from "@serverspot/db/schema";
import { and, eq, lt, lte } from "drizzle-orm";
import type { JobType } from "./types";
import { getRetryDelay, MAX_ATTEMPTS } from "./types";

export async function enqueueJob(
  db: Database,
  type: JobType,
  payload: Record<string, unknown>,
  scheduledAt?: Date,
) {
  const [job] = await db
    .insert(jobOutbox)
    .values({
      type,
      payload,
      scheduledAt: scheduledAt ?? new Date(),
    })
    .returning();
  return job;
}

export type OutboxJob = typeof jobOutbox.$inferSelect;

export async function claimNextJob(db: Database): Promise<OutboxJob | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobOutbox)
      .where(
        and(
          eq(jobOutbox.status, "pending"),
          lte(jobOutbox.scheduledAt, new Date()),
          lt(jobOutbox.attempts, MAX_ATTEMPTS),
        ),
      )
      .orderBy(jobOutbox.scheduledAt)
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) return null;

    const [updated] = await tx
      .update(jobOutbox)
      .set({ status: "processing", attempts: job.attempts + 1 })
      .where(eq(jobOutbox.id, job.id))
      .returning();

    return updated ?? null;
  });
}

export async function completeJob(db: Database, jobId: string) {
  await db
    .update(jobOutbox)
    .set({ status: "completed", processedAt: new Date(), error: null })
    .where(eq(jobOutbox.id, jobId));
}

export async function failJob(db: Database, job: OutboxJob, error: string) {
  const isDead = job.attempts >= MAX_ATTEMPTS;
  const scheduledAt = isDead ? job.scheduledAt : new Date(Date.now() + getRetryDelay(job.attempts));

  await db
    .update(jobOutbox)
    .set({
      status: isDead ? "dead" : "pending",
      error,
      scheduledAt,
    })
    .where(eq(jobOutbox.id, job.id));
}
