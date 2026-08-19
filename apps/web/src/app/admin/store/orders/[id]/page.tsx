import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, getFulfillmentsForOrder, getOrderWithItems } from "@serverspot/store";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/module-pages";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createDb(env.DATABASE_URL);
  const data = await getOrderWithItems(db, id);
  if (!data) notFound();

  const fulfillments = await getFulfillmentsForOrder(db, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/store/orders" className="text-sm text-accent">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Order {data.order.id.slice(0, 8)}…</h1>
        <p className="text-muted-foreground">Payment and fulfilment details</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={data.order.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatPrice(data.order.total, data.order.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{data.order.paymentProvider ?? "—"}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {data.order.paymentReference ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.productName}
              </span>
              <span>{formatPrice(item.unitPrice, data.order.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fulfilment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fulfillments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fulfilment records.</p>
          ) : (
            fulfillments.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{f.orderItemId.slice(0, 8)}…</span>
                <Badge variant="secondary">{f.status}</Badge>
                {f.lastError && <span className="text-destructive">{f.lastError}</span>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
