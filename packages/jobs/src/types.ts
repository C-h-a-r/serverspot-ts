import { z } from "zod";

export const JOB_TYPES = [
  "email.send",
  "order.fulfill",
  "order.fulfill.retry",
  "webhook.deliver",
  "analytics.aggregate",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const emailSendPayload = z.object({
  template: z.string(),
  to: z.string().email(),
  payload: z.record(z.unknown()).default({}),
});

export const orderFulfillPayload = z.object({
  orderId: z.string().uuid(),
});

export const jobPayloadSchemas: Record<JobType, z.ZodType> = {
  "email.send": emailSendPayload,
  "order.fulfill": orderFulfillPayload,
  "order.fulfill.retry": orderFulfillPayload,
  "webhook.deliver": z.object({ deliveryId: z.string().uuid() }),
  "analytics.aggregate": z.object({ date: z.string().optional() }),
};

export const MAX_ATTEMPTS = 5;

export const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  4 * 60 * 60_000,
] as const;

export function getRetryDelay(attempts: number): number {
  const index = Math.min(attempts, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

export function parseJobPayload<T extends JobType>(
  type: T,
  payload: unknown,
): z.infer<(typeof jobPayloadSchemas)[T]> {
  return jobPayloadSchemas[type].parse(payload) as z.infer<(typeof jobPayloadSchemas)[T]>;
}
