import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, getCartWithItems, getOrCreateCart } from "@serverspot/store";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";
import { getCartSessionToken } from "@/lib/store/cart-cookie";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  await requireModule("store");

  const session = await getSession();
  const sessionToken = await getCartSessionToken();
  const db = createDb(env.DATABASE_URL);

  const cart = await getOrCreateCart(db, {
    userId: session?.user.id,
    sessionToken: session ? undefined : sessionToken,
  });

  const cartData = await getCartWithItems(db, cart.id);
  const url = new URL(request.url);

  const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY);
  const paypalEnabled = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

  return renderPublicSpotPage({
    template: "store/checkout.html",
    extraContext: {
      cart: {
        id: cart.id,
        items: (cartData?.items ?? []).map((item) => ({
          name: item.name,
          slug: item.slug,
          quantity: item.quantity,
          price: formatPrice(item.unitPrice, item.currency),
          lineTotal: formatPrice(item.lineTotal, item.currency),
        })),
        subtotal: formatPrice(cartData?.subtotal ?? "0", cartData?.currency ?? "USD"),
        itemCount: cartData?.itemCount ?? 0,
      },
      checkout: {
        stripeEnabled,
        paypalEnabled,
        cancelled: url.searchParams.get("cancelled") === "1",
        error: url.searchParams.get("error") ?? "",
      },
    },
  });
}
