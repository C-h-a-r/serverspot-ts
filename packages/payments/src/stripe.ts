import Stripe from "stripe";
import { z } from "zod";

export type StripeConfig = {
  secretKey: string;
  webhookSecret?: string;
};

export function createStripeClient(config: StripeConfig): Stripe {
  return new Stripe(config.secretKey, { apiVersion: "2025-02-24.acacia" });
}

export const checkoutLineItemSchema = z.object({
  name: z.string(),
  amountCents: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

export type CheckoutLineItem = z.infer<typeof checkoutLineItemSchema>;

export async function createStripeCheckoutSession(
  stripe: Stripe,
  opts: {
    orderId: string;
    lineItems: CheckoutLineItem[];
    currency: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  },
) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: opts.lineItems.map((item) => ({
      price_data: {
        currency: opts.currency.toLowerCase(),
        product_data: { name: item.name },
        unit_amount: item.amountCents,
      },
      quantity: item.quantity,
    })),
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { orderId: opts.orderId },
  });

  return session;
}

export type NormalizedPaymentEvent =
  | { type: "checkout.completed"; orderId: string; paymentReference: string; amountTotal: number }
  | { type: "refund"; orderId: string; paymentReference: string };

export function normalizeStripeWebhookEvent(
  event: Stripe.Event,
): NormalizedPaymentEvent | null {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId || !session.id) return null;
    return {
      type: "checkout.completed",
      orderId,
      paymentReference: session.id,
      amountTotal: session.amount_total ?? 0,
    };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const orderId = charge.metadata?.orderId;
    if (!orderId) return null;
    return {
      type: "refund",
      orderId,
      paymentReference: charge.id,
    };
  }

  return null;
}

export function verifyStripeWebhook(
  stripe: Stripe,
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
