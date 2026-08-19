import { z } from "zod";

export const paypalCaptureSchema = z.object({
  id: z.string(),
  status: z.string(),
  purchase_units: z.array(
    z.object({
      reference_id: z.string().optional(),
      amount: z.object({ value: z.string(), currency_code: z.string() }).optional(),
    }),
  ),
});

export type PayPalConfig = {
  clientId: string;
  clientSecret: string;
  mode?: "sandbox" | "live";
};

async function getPayPalAccessToken(config: PayPalConfig): Promise<string> {
  const base =
    config.mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("PayPal auth failed");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function createPayPalOrder(
  config: PayPalConfig,
  opts: { orderId: string; total: string; currency: string; returnUrl: string; cancelUrl: string },
) {
  const token = await getPayPalAccessToken(config);
  const base =
    config.mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.orderId,
          amount: { currency_code: opts.currency, value: opts.total },
        },
      ],
      application_context: {
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });

  if (!res.ok) throw new Error("PayPal order creation failed");
  return res.json() as Promise<{ id: string; links: { href: string; rel: string }[] }>;
}

export async function capturePayPalOrder(config: PayPalConfig, paypalOrderId: string) {
  const token = await getPayPalAccessToken(config);
  const base =
    config.mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("PayPal capture failed");
  const data = await res.json();
  return paypalCaptureSchema.parse(data);
}

export type NormalizedPayPalEvent = {
  type: "checkout.completed";
  orderId: string;
  paymentReference: string;
};

export function normalizePayPalCapture(capture: z.infer<typeof paypalCaptureSchema>): NormalizedPayPalEvent | null {
  if (capture.status !== "COMPLETED") return null;
  const unit = capture.purchase_units[0];
  const orderId = unit?.reference_id;
  if (!orderId) return null;
  return {
    type: "checkout.completed",
    orderId,
    paymentReference: capture.id,
  };
}
