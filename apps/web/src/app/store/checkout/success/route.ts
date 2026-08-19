import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, getOrderWithItems } from "@serverspot/store";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(request: Request) {
  await requireModule("store");

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  if (!orderId) notFound();

  const db = createDb(env.DATABASE_URL);
  const data = await getOrderWithItems(db, orderId);
  if (!data) notFound();

  return renderPublicSpotPage({
    template: "store/checkout-success.html",
    extraContext: {
      order: {
        id: data.order.id,
        status: data.order.status,
        total: formatPrice(data.order.total, data.order.currency),
        items: data.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatPrice(item.unitPrice, data.order.currency),
        })),
      },
    },
  });
}
