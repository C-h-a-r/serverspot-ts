import type { Database } from "@serverspot/db";
import {
  storeOrderItems,
  storeOrders,
  users,
} from "@serverspot/db/schema";
import { enqueueJob } from "@serverspot/jobs";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clearCart, getCartWithItems } from "./cart";
import { createFulfillmentRecordsForOrder } from "./fulfillment";
import { formatPrice } from "./products";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "fulfilled",
  "partially_fulfilled",
  "refunded",
  "failed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  provider: z.enum(["stripe", "paypal"]),
  userId: z.string().uuid().optional().nullable(),
  customerEmail: z.string().email().optional(),
});

export function priceToCents(price: string): number {
  return Math.round(Number(price) * 100);
}

export async function createOrderFromCart(
  db: Database,
  cartId: string,
  userId?: string | null,
) {
  const cartData = await getCartWithItems(db, cartId);
  if (!cartData || cartData.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const [order] = await db
    .insert(storeOrders)
    .values({
      userId: userId ?? null,
      status: "pending",
      total: cartData.subtotal,
      currency: cartData.currency,
    })
    .returning();

  const orderItems = await db
    .insert(storeOrderItems)
    .values(
      cartData.items.map((item) => ({
        orderId: order!.id,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )
    .returning();

  await createFulfillmentRecordsForOrder(db, orderItems.map((i) => i.id));
  await clearCart(db, cartId);

  return { order: order!, items: orderItems };
}

export async function markOrderPaid(
  db: Database,
  orderId: string,
  paymentProvider: string,
  paymentReference: string,
) {
  const [order] = await db
    .update(storeOrders)
    .set({
      status: "paid",
      paymentProvider,
      paymentReference,
      updatedAt: new Date(),
    })
    .where(and(eq(storeOrders.id, orderId), eq(storeOrders.status, "pending")))
    .returning();

  if (!order) {
    const [existing] = await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.id, orderId))
      .limit(1);
    if (existing?.status === "paid") return existing;
    throw new Error("Order not found or already processed");
  }

  await db
    .update(storeOrders)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(storeOrders.id, orderId));

  await enqueueJob(db, "order.fulfill", { orderId });
  await enqueueReceiptEmail(db, orderId);

  return order;
}

export async function markOrderRefunded(db: Database, orderId: string) {
  const [order] = await db
    .update(storeOrders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(storeOrders.id, orderId))
    .returning();

  if (order) {
    await enqueueJob(db, "email.send", {
      template: "order-refund",
      to: await getOrderCustomerEmail(db, orderId),
      payload: { siteName: "ServerSpot", orderId },
    });
  }

  return order ?? null;
}

export async function markOrderFailed(db: Database, orderId: string) {
  const [order] = await db
    .update(storeOrders)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(storeOrders.id, orderId))
    .returning();
  return order ?? null;
}

async function getOrderCustomerEmail(db: Database, orderId: string): Promise<string> {
  const [row] = await db
    .select({ email: users.email })
    .from(storeOrders)
    .leftJoin(users, eq(storeOrders.userId, users.id))
    .where(eq(storeOrders.id, orderId))
    .limit(1);

  return row?.email ?? "noreply@example.com";
}

async function enqueueReceiptEmail(db: Database, orderId: string) {
  const data = await getOrderWithItems(db, orderId);
  if (!data) return;

  const email = await getOrderCustomerEmail(db, orderId);
  await enqueueJob(db, "email.send", {
    template: "order-receipt",
    to: email,
    payload: {
      siteName: "ServerSpot",
      orderId,
      total: formatPrice(data.order.total, data.order.currency),
      items: data.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: formatPrice(item.unitPrice, data.order.currency),
      })),
    },
  });
}

export async function getOrderWithItems(db: Database, orderId: string) {
  const [order] = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db
    .select()
    .from(storeOrderItems)
    .where(eq(storeOrderItems.orderId, orderId));
  return { order, items };
}

export async function listOrders(db: Database, limit = 50) {
  return db.select().from(storeOrders).orderBy(desc(storeOrders.createdAt)).limit(limit);
}

export async function updateOrderFulfillmentStatus(db: Database, orderId: string) {
  const data = await getOrderWithItems(db, orderId);
  if (!data) return;

  const { getFulfillmentsForOrder } = await import("./fulfillment");
  const fulfillments = await getFulfillmentsForOrder(db, orderId);

  if (fulfillments.length === 0) return;

  const allFulfilled = fulfillments.every((f) => f.status === "delivered");
  const anyDelivered = fulfillments.some((f) => f.status === "delivered");
  const anyFailed = fulfillments.some((f) => f.status === "failed");

  let status: OrderStatus = "processing";
  if (allFulfilled) status = "fulfilled";
  else if (anyDelivered) status = "partially_fulfilled";
  else if (anyFailed && !anyDelivered) status = "failed";

  await db
    .update(storeOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(storeOrders.id, orderId));
}
