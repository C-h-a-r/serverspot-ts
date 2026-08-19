import type { Database } from "@serverspot/db";
import {
  capturePayPalOrder,
  createPayPalOrder,
  createStripeCheckoutSession,
  createStripeClient,
  type PayPalConfig,
  type StripeConfig,
} from "@serverspot/payments";
import { createOrderFromCart, priceToCents } from "./orders";
import { getCartWithItems } from "./cart";

export type CheckoutInitResult =
  | { provider: "stripe"; checkoutUrl: string; orderId: string }
  | { provider: "paypal"; approvalUrl: string; paypalOrderId: string; orderId: string };

export async function initiateCheckout(
  db: Database,
  opts: {
    cartId: string;
    provider: "stripe" | "paypal";
    userId?: string | null;
    customerEmail?: string;
    appUrl: string;
    stripe?: StripeConfig;
    paypal?: PayPalConfig;
  },
): Promise<CheckoutInitResult> {
  const cartData = await getCartWithItems(db, opts.cartId);
  if (!cartData || cartData.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const { order } = await createOrderFromCart(db, opts.cartId, opts.userId);

  if (opts.provider === "stripe") {
    if (!opts.stripe?.secretKey) throw new Error("Stripe is not configured");

    const stripe = createStripeClient(opts.stripe);
    const session = await createStripeCheckoutSession(stripe, {
      orderId: order.id,
      currency: cartData.currency,
      customerEmail: opts.customerEmail,
      successUrl: `${opts.appUrl}/store/checkout/success?order=${order.id}`,
      cancelUrl: `${opts.appUrl}/store/checkout?cancelled=1`,
      lineItems: cartData.items.map((item) => ({
        name: item.name,
        amountCents: priceToCents(item.unitPrice),
        quantity: item.quantity,
      })),
    });

    if (!session.url) throw new Error("Stripe session URL missing");
    return { provider: "stripe", checkoutUrl: session.url, orderId: order.id };
  }

  if (!opts.paypal?.clientId || !opts.paypal.clientSecret) {
    throw new Error("PayPal is not configured");
  }

  const paypalOrder = await createPayPalOrder(opts.paypal, {
    orderId: order.id,
    total: cartData.subtotal,
    currency: cartData.currency,
    returnUrl: `${opts.appUrl}/store/checkout/paypal/return?order=${order.id}`,
    cancelUrl: `${opts.appUrl}/store/checkout?cancelled=1`,
  });

  const approvalLink = paypalOrder.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("PayPal approval URL missing");

  return {
    provider: "paypal",
    approvalUrl: approvalLink.href,
    paypalOrderId: paypalOrder.id,
    orderId: order.id,
  };
}

export async function capturePayPalCheckout(
  db: Database,
  opts: {
    paypalOrderId: string;
    paypal: PayPalConfig;
    onPaid: (orderId: string, paymentReference: string) => Promise<void>;
  },
) {
  const capture = await capturePayPalOrder(opts.paypal, opts.paypalOrderId);
  const { normalizePayPalCapture } = await import("@serverspot/payments");
  const event = normalizePayPalCapture(capture);
  if (!event) throw new Error("PayPal capture not completed");

  await opts.onPaid(event.orderId, event.paymentReference);
  return event;
}
