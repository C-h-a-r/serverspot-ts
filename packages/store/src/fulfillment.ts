import type { Database } from "@serverspot/db";
import {
  storeOrderFulfillments,
  storeOrderItems,
  storeOrders,
} from "@serverspot/db/schema";
import { eq, inArray } from "drizzle-orm";

export type FulfillmentStatus = "pending" | "processing" | "delivered" | "failed";

export async function createFulfillmentRecordsForOrder(
  db: Database,
  orderItemIds: string[],
) {
  if (orderItemIds.length === 0) return [];

  return db
    .insert(storeOrderFulfillments)
    .values(
      orderItemIds.map((orderItemId) => ({
        orderItemId,
        status: "pending" as const,
        provider: "game",
      })),
    )
    .returning();
}

export async function getFulfillmentsForOrder(db: Database, orderId: string) {
  const items = await db
    .select({ id: storeOrderItems.id })
    .from(storeOrderItems)
    .where(eq(storeOrderItems.orderId, orderId));

  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.id);
  return db
    .select()
    .from(storeOrderFulfillments)
    .where(inArray(storeOrderFulfillments.orderItemId, itemIds));
}

export async function fulfillOrder(
  db: Database,
  orderId: string,
  gameGatewayUrl?: string,
) {
  const [order] = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");

  const fulfillments = await getFulfillmentsForOrder(db, orderId);
  const pending = fulfillments.filter((f) => f.status === "pending" || f.status === "processing");

  for (const fulfillment of pending) {
    await fulfillOrderItem(db, fulfillment.id, orderId, gameGatewayUrl);
  }

  const { updateOrderFulfillmentStatus } = await import("./orders");
  await updateOrderFulfillmentStatus(db, orderId);
}

async function fulfillOrderItem(
  db: Database,
  fulfillmentId: string,
  orderId: string,
  gameGatewayUrl?: string,
) {
  const [fulfillment] = await db
    .select()
    .from(storeOrderFulfillments)
    .where(eq(storeOrderFulfillments.id, fulfillmentId))
    .limit(1);

  if (!fulfillment || fulfillment.status === "delivered") return;

  await db
    .update(storeOrderFulfillments)
    .set({ status: "processing", attempts: fulfillment.attempts + 1, updatedAt: new Date() })
    .where(eq(storeOrderFulfillments.id, fulfillmentId));

  try {
    if (gameGatewayUrl) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const secret = process.env.GAME_GATEWAY_SECRET;
      if (secret) headers.Authorization = `Bearer ${secret}`;

      const res = await fetch(`${gameGatewayUrl}/commands`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "DELIVER_ORDER",
          orderId,
          fulfillmentId,
          commands: [`say Order ${orderId.slice(0, 8)} fulfilled — thank you!`],
        }),
      });
      if (!res.ok) throw new Error(`Game gateway returned ${res.status}`);
    }

    await db
      .update(storeOrderFulfillments)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderFulfillments.id, fulfillmentId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fulfillment failed";
    await db
      .update(storeOrderFulfillments)
      .set({
        status: "failed",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderFulfillments.id, fulfillmentId));
    throw err;
  }
}
