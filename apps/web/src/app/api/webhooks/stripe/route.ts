import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import {
  createStripeClient,
  normalizeStripeWebhookEvent,
  verifyStripeWebhook,
} from "@serverspot/payments";
import { markOrderPaid, markOrderRefunded, getOrderWithItems } from "@serverspot/store";
import { NextResponse } from "next/server";
import { onOrderCompleted } from "@/lib/integrations";

export async function POST(request: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = createStripeClient({ secretKey: env.STRIPE_SECRET_KEY });

  let event;
  try {
    event = verifyStripeWebhook(stripe, payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const normalized = normalizeStripeWebhookEvent(event);
  if (!normalized) {
    return NextResponse.json({ received: true });
  }

  const db = createDb(env.DATABASE_URL);

  if (normalized.type === "checkout.completed") {
    await markOrderPaid(db, normalized.orderId, "stripe", normalized.paymentReference);
    const orderData = await getOrderWithItems(db, normalized.orderId);
    if (orderData) {
      await onOrderCompleted(db, {
        id: orderData.order.id,
        userId: orderData.order.userId,
        total: orderData.order.total,
      });
    }
  } else if (normalized.type === "refund") {
    await markOrderRefunded(db, normalized.orderId);
  }

  return NextResponse.json({ received: true });
}
