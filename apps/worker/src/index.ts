import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { claimNextJob, completeJob, enqueueJob, failJob, parseJobPayload } from "@serverspot/jobs";
import { processJob } from "@serverspot/jobs/handlers";
import { createLogger } from "@serverspot/observability";
import { fulfillOrder } from "@serverspot/store";

const log = createLogger("worker");
const POLL_INTERVAL_MS = 5_000;
const AGGREGATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function handleOrderFulfill(db: ReturnType<typeof createDb>, job: Awaited<ReturnType<typeof claimNextJob>>) {
  if (!job) return;
  const payload = parseJobPayload("order.fulfill", job.payload);
  await fulfillOrder(db, payload.orderId, env.GAME_GATEWAY_URL);
  await completeJob(db, job.id);
}

async function pollOnce() {
  const db = createDb(env.DATABASE_URL);

  const job = await claimNextJob(db);
  if (!job) return;

  log.info({ jobId: job.id, type: job.type }, "Processing job");

  try {
    if (job.type === "order.fulfill" || job.type === "order.fulfill.retry") {
      await handleOrderFulfill(db, job);
    } else {
      await processJob(
        {
          db,
          email: {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
            from: env.SMTP_FROM ?? "noreply@example.com",
          },
        },
        job,
      );
    }
    log.info({ jobId: job.id, type: job.type }, "Job completed");
  } catch (err) {
    log.error({ err, jobId: job.id, type: job.type }, "Job failed");
    if (job.type === "order.fulfill" || job.type === "order.fulfill.retry") {
      const message = err instanceof Error ? err.message : "Job failed";
      await failJob(db, job, message);
    }
  }
}

async function scheduleDailyAggregate() {
  const db = createDb(env.DATABASE_URL);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await enqueueJob(db, "analytics.aggregate", { date: yesterday.toISOString().slice(0, 10) });
  log.info("Scheduled analytics.aggregate for yesterday");
}

async function main() {
  log.info("ServerSpot worker starting — outbox poller active");

  scheduleDailyAggregate().catch((err) => log.error({ err }, "Failed to schedule aggregate"));

  setInterval(() => {
    scheduleDailyAggregate().catch((err) => log.error({ err }, "Failed to schedule aggregate"));
  }, AGGREGATE_INTERVAL_MS);

  setInterval(() => {
    pollOnce().catch((err) => log.error({ err }, "Poll cycle error"));
  }, POLL_INTERVAL_MS);

  await pollOnce();
}

main().catch((err) => {
  log.error({ err }, "Worker crashed");
  process.exit(1);
});
