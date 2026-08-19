import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listOrders } from "@serverspot/store";
import Link from "next/link";
import { AdminDataList, StatusBadge } from "@/components/admin/module-pages";

export default async function AdminStoreOrdersPage() {
  const db = createDb(env.DATABASE_URL);
  const orders = await listOrders(db);

  return (
    <AdminDataList
      title="Orders"
      description="View and manage customer orders"
      rows={orders}
      columns={[
        {
          key: "id",
          header: "Order",
          render: (o) => (
            <Link href={`/admin/store/orders/${o.id}`} className="font-mono text-xs text-accent">
              {o.id.slice(0, 8)}…
            </Link>
          ),
        },
        { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
        { key: "total", header: "Total", render: (o) => `${o.currency} ${o.total}` },
        {
          key: "created",
          header: "Created",
          render: (o) => new Date(o.createdAt).toLocaleDateString(),
        },
      ]}
    />
  );
}
