import { Badge } from "@serverspot/ui";
import Link from "next/link";

type Stat = { label: string; value: string | number };

type AdminModuleOverviewProps = {
  title: string;
  description: string;
  stats: Stat[];
  links: { label: string; href: string }[];
};

export function AdminModuleOverview({
  title,
  description,
  stats,
  links,
}: AdminModuleOverviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-lg)] border border-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[var(--radius-sm)] border border-border bg-muted/40 px-4 py-3 text-sm hover:border-accent/40"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

type AdminDataListProps<T> = {
  title: string;
  description?: string;
  createHref?: string;
  createLabel?: string;
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function AdminDataList<T extends { id: string }>({
  title,
  description,
  createHref,
  createLabel = "Create",
  columns,
  rows,
  emptyMessage = "No items yet.",
}: AdminDataListProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {createHref && (
          <Link
            href={createHref}
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {createLabel}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="secondary">{status}</Badge>;
}
