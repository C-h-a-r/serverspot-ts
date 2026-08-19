import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Database } from "@serverspot/db";
import {
  apiKeys,
  apiKeyUsageLogs,
  webhookDeliveries,
  webhookEvents,
  webhooks,
} from "@serverspot/db/schema";
import { enqueueJob } from "@serverspot/jobs";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string } {
  const prefix = `ssk_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(24).toString("hex");
  return { key: `${prefix}_${secret}`, prefix };
}

export const createApiKeySchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1),
  scopes: z.array(z.string()).default(["read"]),
});

export async function createApiKey(db: Database, input: z.infer<typeof createApiKeySchema>) {
  const data = createApiKeySchema.parse(input);
  const { key, prefix } = generateApiKey();

  const [record] = await db
    .insert(apiKeys)
    .values({
      userId: data.userId,
      name: data.name,
      keyPrefix: prefix,
      keyHash: hashApiKey(key),
      scopes: data.scopes,
    })
    .returning();

  return { apiKey: record!, secret: key };
}

export async function verifyApiKey(db: Database, key: string) {
  const hash = hashApiKey(key);
  const [record] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.active, true)))
    .limit(1);

  if (!record) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, record.id));

  return record;
}

export async function logApiKeyUsage(
  db: Database,
  apiKeyId: string,
  path: string,
  method: string,
  statusCode: number,
) {
  await db.insert(apiKeyUsageLogs).values({ apiKeyId, path, method, statusCode });
}

export async function listApiKeys(db: Database, userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      active: apiKeys.active,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export const createWebhookSchema = z.object({
  userId: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function createWebhook(db: Database, input: z.infer<typeof createWebhookSchema>) {
  const data = createWebhookSchema.parse(input);
  const secret = randomBytes(32).toString("hex");

  const [webhook] = await db
    .insert(webhooks)
    .values({
      userId: data.userId,
      url: data.url,
      secret,
      events: data.events,
    })
    .returning();

  return { webhook: webhook!, secret };
}

export async function listWebhooks(db: Database, userId: string) {
  return db.select().from(webhooks).where(eq(webhooks.userId, userId)).orderBy(desc(webhooks.createdAt));
}

export async function emitWebhookEvent(
  db: Database,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const [event] = await db
    .insert(webhookEvents)
    .values({ eventType, payload })
    .returning();

  const subscribers = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.active, true));

  const matching = subscribers.filter((w) => {
    const events = w.events as string[];
    return events.includes(eventType) || events.includes("*");
  });

  for (const webhook of matching) {
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        eventId: event!.id,
        status: "pending",
      })
      .returning();

    await enqueueJob(db, "webhook.deliver", { deliveryId: delivery!.id });
  }

  return event!;
}

export async function getWebhookDelivery(db: Database, deliveryId: string) {
  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);
  if (!delivery) return null;

  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, delivery.webhookId))
    .limit(1);

  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, delivery.eventId))
    .limit(1);

  if (!webhook || !event) return null;
  return { delivery, webhook, event };
}

export function signWebhookPayload(secret: string, body: string): string {
  return createHmacSha256(secret, body);
}

function createHmacSha256(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function deliverWebhook(
  db: Database,
  deliveryId: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const data = await getWebhookDelivery(db, deliveryId);
  if (!data) throw new Error("Delivery not found");

  const body = JSON.stringify({
    id: data.event.id,
    type: data.event.eventType,
    data: data.event.payload,
    createdAt: data.event.createdAt.toISOString(),
  });

  const signature = signWebhookPayload(data.webhook.secret, body);

  try {
    const res = await fetch(data.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ServerSpot-Signature": signature,
        "X-ServerSpot-Event": data.event.eventType,
      },
      body,
    });

    const success = res.ok;
    await db
      .update(webhookDeliveries)
      .set({
        status: success ? "delivered" : "failed",
        attempts: data.delivery.attempts + 1,
        responseCode: res.status,
        deliveredAt: success ? new Date() : null,
        error: success ? null : `HTTP ${res.status}`,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return { success, statusCode: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delivery failed";
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        attempts: data.delivery.attempts + 1,
        error: message,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return { success: false, error: message };
  }
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const expected = signWebhookPayload(secret, body);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function listWebhookDeliveries(db: Database, webhookId: string, limit = 20) {
  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}
