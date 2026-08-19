import { describe, expect, it } from "vitest";
import { normalizeStripeWebhookEvent } from "./stripe";

describe("payments", () => {
  it("normalizes checkout.session.completed", () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: { orderId: "order-1" },
          amount_total: 999,
        },
      },
    } as never;

    expect(normalizeStripeWebhookEvent(event)).toEqual({
      type: "checkout.completed",
      orderId: "order-1",
      paymentReference: "cs_test_123",
      amountTotal: 999,
    });
  });
});
