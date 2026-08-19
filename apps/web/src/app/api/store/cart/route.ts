import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import {
  addToCart,
  addToCartSchema,
  getCartWithItems,
  getOrCreateCart,
  updateCartItemQuantity,
} from "@serverspot/store";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cartCookieOptions, getCartSessionToken } from "@/lib/store/cart-cookie";
import { requireModule } from "@/lib/modules";

async function resolveCart() {
  const db = createDb(env.DATABASE_URL);
  const session = await getSession();
  const sessionToken = await getCartSessionToken();

  const cart = await getOrCreateCart(db, {
    userId: session?.user.id,
    sessionToken: session ? undefined : sessionToken,
  });

  return { db, cart, session };
}

export async function GET() {
  await requireModule("store");
  const { db, cart } = await resolveCart();
  const data = await getCartWithItems(db, cart.id);

  return NextResponse.json({
    cartId: cart.id,
    items: data?.items ?? [],
    subtotal: data?.subtotal ?? "0.00",
    currency: data?.currency ?? "USD",
    itemCount: data?.itemCount ?? 0,
  });
}

export async function POST(request: Request) {
  await requireModule("store");
  const body = await request.json();
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { db, cart, session } = await resolveCart();

  try {
    await addToCart(db, cart.id, parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add to cart";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = await getCartWithItems(db, cart.id);
  const response = NextResponse.json({
    cartId: cart.id,
    items: data?.items ?? [],
    subtotal: data?.subtotal ?? "0.00",
    itemCount: data?.itemCount ?? 0,
  });

  if (!session && cart.sessionToken) {
    response.cookies.set(cartCookieOptions(cart.sessionToken));
  }

  return response;
}

export async function PATCH(request: Request) {
  await requireModule("store");
  const body = (await request.json()) as { productId?: string; quantity?: number };
  if (!body.productId || body.quantity === undefined) {
    return NextResponse.json({ error: "productId and quantity required" }, { status: 400 });
  }

  const { db, cart } = await resolveCart();
  await updateCartItemQuantity(db, cart.id, body.productId, body.quantity);
  const data = await getCartWithItems(db, cart.id);

  return NextResponse.json({
    cartId: cart.id,
    items: data?.items ?? [],
    subtotal: data?.subtotal ?? "0.00",
    itemCount: data?.itemCount ?? 0,
  });
}
