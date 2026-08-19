import type { Database } from "@serverspot/db";
import {
  storeCartItems,
  storeCarts,
  storeProducts,
} from "@serverspot/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateToken } from "@serverspot/utils";
import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99).default(1),
});

export type CartItemWithProduct = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  unitPrice: string;
  currency: string;
  lineTotal: string;
};

export async function getOrCreateCart(
  db: Database,
  opts: { userId?: string | null; sessionToken?: string | null },
) {
  if (opts.userId) {
    const [existing] = await db
      .select()
      .from(storeCarts)
      .where(eq(storeCarts.userId, opts.userId))
      .limit(1);
    if (existing) return existing;
  }

  if (opts.sessionToken) {
    const [existing] = await db
      .select()
      .from(storeCarts)
      .where(eq(storeCarts.sessionToken, opts.sessionToken))
      .limit(1);
    if (existing) return existing;
  }

  const sessionToken = opts.sessionToken ?? generateToken(32);
  const [cart] = await db
    .insert(storeCarts)
    .values({
      userId: opts.userId ?? null,
      sessionToken: opts.userId ? null : sessionToken,
    })
    .returning();

  return cart!;
}

export async function mergeGuestCartToUser(
  db: Database,
  sessionToken: string,
  userId: string,
) {
  const [guestCart] = await db
    .select()
    .from(storeCarts)
    .where(eq(storeCarts.sessionToken, sessionToken))
    .limit(1);
  if (!guestCart) return;

  const userCart = await getOrCreateCart(db, { userId });
  const guestItems = await db
    .select()
    .from(storeCartItems)
    .where(eq(storeCartItems.cartId, guestCart.id));

  for (const item of guestItems) {
    await db
      .insert(storeCartItems)
      .values({ cartId: userCart.id, productId: item.productId, quantity: item.quantity })
      .onConflictDoUpdate({
        target: [storeCartItems.cartId, storeCartItems.productId],
        set: { quantity: sql`${storeCartItems.quantity} + ${item.quantity}` },
      });
  }

  await db.delete(storeCarts).where(eq(storeCarts.id, guestCart.id));
}

export async function addToCart(
  db: Database,
  cartId: string,
  input: z.infer<typeof addToCartSchema>,
) {
  const data = addToCartSchema.parse(input);

  const [product] = await db
    .select()
    .from(storeProducts)
    .where(and(eq(storeProducts.id, data.productId), isNull(storeProducts.deletedAt)))
    .limit(1);

  if (!product || !product.visible) {
    throw new Error("Product not available");
  }

  if (product.stock !== null && product.stock < data.quantity) {
    throw new Error("Insufficient stock");
  }

  const [item] = await db
    .insert(storeCartItems)
    .values({ cartId, productId: data.productId, quantity: data.quantity })
    .onConflictDoUpdate({
      target: [storeCartItems.cartId, storeCartItems.productId],
      set: { quantity: sql`${storeCartItems.quantity} + ${data.quantity}` },
    })
    .returning();

  return item;
}

export async function updateCartItemQuantity(
  db: Database,
  cartId: string,
  productId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    await db
      .delete(storeCartItems)
      .where(and(eq(storeCartItems.cartId, cartId), eq(storeCartItems.productId, productId)));
    return;
  }

  await db
    .update(storeCartItems)
    .set({ quantity })
    .where(and(eq(storeCartItems.cartId, cartId), eq(storeCartItems.productId, productId)));
}

export async function clearCart(db: Database, cartId: string) {
  await db.delete(storeCartItems).where(eq(storeCartItems.cartId, cartId));
}

export async function getCartWithItems(db: Database, cartId: string) {
  const [cart] = await db.select().from(storeCarts).where(eq(storeCarts.id, cartId)).limit(1);
  if (!cart) return null;

  const rows = await db
    .select({
      id: storeCartItems.id,
      productId: storeCartItems.productId,
      quantity: storeCartItems.quantity,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      salePrice: storeProducts.salePrice,
      currency: storeProducts.currency,
    })
    .from(storeCartItems)
    .innerJoin(storeProducts, eq(storeCartItems.productId, storeProducts.id))
    .where(eq(storeCartItems.cartId, cartId));

  const items: CartItemWithProduct[] = rows.map((row) => {
    const unitPrice = row.salePrice ?? row.price;
    const lineTotal = (Number(unitPrice) * row.quantity).toFixed(2);
    return {
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      name: row.name,
      slug: row.slug,
      unitPrice,
      currency: row.currency,
      lineTotal,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0).toFixed(2);
  const currency = items[0]?.currency ?? "USD";

  return { cart, items, subtotal, currency, itemCount: items.reduce((n, i) => n + i.quantity, 0) };
}
