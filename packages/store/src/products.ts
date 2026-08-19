import type { Database } from "@serverspot/db";
import { storeCategories, storeOrders, storeProducts } from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["item", "rank", "bundle", "subscription", "cosmetic", "perk"]).default("item"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().default("USD"),
  categoryId: z.string().uuid().optional().nullable(),
  featured: z.boolean().default(false),
  visible: z.boolean().default(true),
  giftable: z.boolean().default(false),
  stock: z.number().int().optional().nullable(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export async function listProducts(db: Database, opts: { visibleOnly?: boolean } = {}) {
  const conditions = [isNull(storeProducts.deletedAt)];
  if (opts.visibleOnly) conditions.push(eq(storeProducts.visible, true));

  return db
    .select()
    .from(storeProducts)
    .where(and(...conditions))
    .orderBy(desc(storeProducts.createdAt));
}

export async function getProductBySlug(db: Database, slug: string) {
  const [product] = await db
    .select()
    .from(storeProducts)
    .where(and(eq(storeProducts.slug, slug), isNull(storeProducts.deletedAt)))
    .limit(1);
  return product ?? null;
}

export async function createProduct(db: Database, input: ProductInput) {
  const data = productInputSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.name);

  const [product] = await db
    .insert(storeProducts)
    .values({ ...data, slug })
    .returning();
  return product;
}

export async function listCategories(db: Database) {
  return db
    .select()
    .from(storeCategories)
    .where(isNull(storeCategories.deletedAt))
    .orderBy(storeCategories.sortOrder);
}

export async function getStoreStats(db: Database) {
  const [productCount] = await db.select({ count: count() }).from(storeProducts).where(isNull(storeProducts.deletedAt));
  const [orderCount] = await db.select({ count: count() }).from(storeOrders);
  return {
    products: productCount?.count ?? 0,
    orders: orderCount?.count ?? 0,
  };
}

export function formatPrice(price: string | null, currency = "USD"): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(price));
}

export function validateCoupon(_code: string, _subtotal: number): { valid: boolean; discount: number } {
  return { valid: false, discount: 0 };
}
