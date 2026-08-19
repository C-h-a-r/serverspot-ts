import type { Database } from "@serverspot/db";
import { aggregateDailyMetrics } from "@serverspot/analytics";
import { deliverWebhook } from "@serverspot/developer";
import { createMailTransport, sendTemplatedEmail, type EmailConfig } from "@serverspot/email";
import { completeJob, failJob, type OutboxJob } from "./outbox";
import { parseJobPayload } from "./types";

export type JobHandlerContext = {
  db: Database;
  email?: EmailConfig & { from: string };
};

export async function processJob(ctx: JobHandlerContext, job: OutboxJob) {
  try {
    switch (job.type) {
      case "email.send":
        await handleEmailSend(ctx, job);
        break;
      case "webhook.deliver":
        await handleWebhookDeliver(ctx, job);
        break;
      case "analytics.aggregate":
        await handleAnalyticsAggregate(ctx, job);
        break;
    }
    await completeJob(ctx.db, job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Job failed";
    await failJob(ctx.db, job, message);
    throw err;
  }
}

async function handleEmailSend(ctx: JobHandlerContext, job: OutboxJob) {
  const payload = parseJobPayload("email.send", job.payload);
  const transport = createMailTransport(ctx.email ?? {});
  const from = ctx.email?.from ?? "noreply@example.com";

  await sendTemplatedEmail(transport, {
    to: payload.to,
    template: payload.template,
    payload: payload.payload,
    from,
  });
}

async function handleWebhookDeliver(ctx: JobHandlerContext, job: OutboxJob) {
  const payload = parseJobPayload("webhook.deliver", job.payload);
  await deliverWebhook(ctx.db, payload.deliveryId);
}

async function handleAnalyticsAggregate(ctx: JobHandlerContext, job: OutboxJob) {
  const payload = parseJobPayload("analytics.aggregate", job.payload);
  const date = payload.date ? new Date(payload.date) : new Date();
  await aggregateDailyMetrics(ctx.db, date);
}
