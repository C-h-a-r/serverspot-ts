import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const storeCategories = pgTable(
  "store_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    accent: text("accent"),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("store_categories_slug_idx").on(table.slug)],
);

export const storeProducts = pgTable(
  "store_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    type: text("type").notNull().default("item"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    categoryId: uuid("category_id").references(() => storeCategories.id, {
      onDelete: "set null",
    }),
    featured: boolean("featured").notNull().default(false),
    visible: boolean("visible").notNull().default(true),
    giftable: boolean("giftable").notNull().default(false),
    stock: integer("stock"),
    expiryDays: integer("expiry_days"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("store_products_slug_idx").on(table.slug),
    index("store_products_category_id_idx").on(table.categoryId),
    index("store_products_visible_idx").on(table.visible),
  ],
);

export const storeOrders = pgTable(
  "store_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    paymentProvider: text("payment_provider"),
    paymentReference: text("payment_reference"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("store_orders_user_id_idx").on(table.userId),
    index("store_orders_status_idx").on(table.status),
    index("store_orders_created_at_idx").on(table.createdAt),
  ],
);

export const storeOrderItems = pgTable(
  "store_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => storeOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => storeProducts.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("store_order_items_order_id_idx").on(table.orderId)],
);

export const storeCoupons = pgTable(
  "store_coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    discountType: text("discount_type").notNull().default("percent"),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_coupons_code_idx").on(table.code)],
);

export const storeCarts = pgTable(
  "store_carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("store_carts_user_id_idx").on(table.userId),
    uniqueIndex("store_carts_session_token_idx").on(table.sessionToken),
  ],
);

export const storeCartItems = pgTable(
  "store_cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => storeCarts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("store_cart_items_cart_id_idx").on(table.cartId),
    uniqueIndex("store_cart_items_cart_product_idx").on(table.cartId, table.productId),
  ],
);

export const storeOrderFulfillments = pgTable(
  "store_order_fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => storeOrderItems.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    provider: text("provider").notNull().default("game"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("store_order_fulfillments_order_item_id_idx").on(table.orderItemId),
    index("store_order_fulfillments_status_idx").on(table.status),
  ],
);

export const storeCartsRelations = relations(storeCarts, ({ many }) => ({
  items: many(storeCartItems),
}));

export const storeCartItemsRelations = relations(storeCartItems, ({ one }) => ({
  cart: one(storeCarts, { fields: [storeCartItems.cartId], references: [storeCarts.id] }),
  product: one(storeProducts, {
    fields: [storeCartItems.productId],
    references: [storeProducts.id],
  }),
}));

export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  category: one(storeCategories, {
    fields: [storeProducts.categoryId],
    references: [storeCategories.id],
  }),
}));

export const storeOrdersRelations = relations(storeOrders, ({ one, many }) => ({
  user: one(users, { fields: [storeOrders.userId], references: [users.id] }),
  items: many(storeOrderItems),
}));

export const storeOrderItemsRelations = relations(storeOrderItems, ({ one }) => ({
  order: one(storeOrders, { fields: [storeOrderItems.orderId], references: [storeOrders.id] }),
  product: one(storeProducts, {
    fields: [storeOrderItems.productId],
    references: [storeProducts.id],
  }),
}));
