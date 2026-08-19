import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { capturePayPalCheckout, markOrderPaid, getOrderWithItems } from "@serverspot/store";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { onOrderCompleted } from "@/lib/integrations";

export async function GET(request: Request) {
  await requireModule("store");

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    redirect("/store/checkout?error=paypal");
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const orderId = url.searchParams.get("order");

  if (!token) redirect("/store/checkout?error=paypal");

  const db = createDb(env.DATABASE_URL);

  try {
    await capturePayPalCheckout(db, {
      paypalOrderId: token,
      paypal: {
        clientId: env.PAYPAL_CLIENT_ID,
        clientSecret: env.PAYPAL_CLIENT_SECRET,
        mode: process.env.PAYPAL_MODE === "live" ? "live" : "sandbox",
      },
      onPaid: async (id, paymentReference) => {
        await markOrderPaid(db, id, "paypal", paymentReference);
        const orderData = await getOrderWithItems(db, id);
        if (orderData) {
          await onOrderCompleted(db, {
            id: orderData.order.id,
            userId: orderData.order.userId,
            total: orderData.order.total,
          });
        }
      },
    });
  } catch {
    redirect("/store/checkout?error=paypal");
  }

  redirect(`/store/checkout/success?order=${orderId ?? ""}`);
}
