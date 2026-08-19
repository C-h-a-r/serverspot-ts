import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { checkoutSchema, getOrCreateCart, initiateCheckout } from "@serverspot/store";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireModule } from "@/lib/modules";
import { cartCookieOptions, getCartSessionToken } from "@/lib/store/cart-cookie";

export async function POST(request: Request) {
  await requireModule("store");
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await getSession();
  const sessionToken = await getCartSessionToken();
  const db = createDb(env.DATABASE_URL);

  const cart = await getOrCreateCart(db, {
    userId: session?.user.id,
    sessionToken: session ? undefined : sessionToken,
  });

  if (cart.id !== parsed.data.cartId) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 403 });
  }

  try {
    const result = await initiateCheckout(db, {
      cartId: cart.id,
      provider: parsed.data.provider,
      userId: session?.user.id,
      customerEmail: session?.user.email ?? parsed.data.customerEmail,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      stripe: env.STRIPE_SECRET_KEY
        ? { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET }
        : undefined,
      paypal:
        env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET
          ? {
              clientId: env.PAYPAL_CLIENT_ID,
              clientSecret: env.PAYPAL_CLIENT_SECRET,
              mode: process.env.PAYPAL_MODE === "live" ? "live" : "sandbox",
            }
          : undefined,
    });

    const response = NextResponse.json(result);
    if (!session && cart.sessionToken) {
      response.cookies.set(cartCookieOptions(cart.sessionToken));
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
