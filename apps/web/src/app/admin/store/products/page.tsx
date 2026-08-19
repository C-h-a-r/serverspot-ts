import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, listProducts } from "@serverspot/store";
import Link from "next/link";
import { AdminDataList } from "@/components/admin/module-pages";
import { Badge } from "@serverspot/ui";

export default async function AdminStoreProductsPage() {
  const db = createDb(env.DATABASE_URL);
  const products = await listProducts(db);

  return (
    <AdminDataList
      title="Products"
      description="Manage store catalog"
      createHref="/admin/store/products/new"
      createLabel="New product"
      rows={products}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (p) => (
            <Link href={`/admin/store/products/${p.id}`} className="text-accent hover:underline">
              {p.name}
            </Link>
          ),
        },
        { key: "type", header: "Type", render: (p) => p.type },
        {
          key: "price",
          header: "Price",
          render: (p) => formatPrice(p.salePrice ?? p.price, p.currency),
        },
        {
          key: "visible",
          header: "Status",
          render: (p) => (
            <Badge variant={p.visible ? "default" : "secondary"}>
              {p.visible ? "Visible" : "Hidden"}
            </Badge>
          ),
        },
      ]}
    />
  );
}
