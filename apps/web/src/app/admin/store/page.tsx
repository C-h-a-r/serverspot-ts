import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import {
  formatPrice,
  getStoreStats,
  listOrders,
  listProducts,
} from "@serverspot/store";
import Link from "next/link";
import {
  AdminDataList,
  AdminModuleOverview,
  StatusBadge,
} from "@/components/admin/module-pages";

export default async function AdminStorePage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getStoreStats(db);

  return (
    <AdminModuleOverview
      title="Store"
      description="Products, orders, and checkout settings"
      stats={[
        { label: "Products", value: stats.products },
        { label: "Orders", value: stats.orders },
      ]}
      links={[
        { label: "Products", href: "/admin/store/products" },
        { label: "Orders", href: "/admin/store/orders" },
        { label: "Settings", href: "/admin/store/settings" },
        { label: "View public store", href: "/store" },
      ]}
    />
  );
}
