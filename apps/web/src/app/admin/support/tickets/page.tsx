import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listTickets } from "@serverspot/support";
import Link from "next/link";
import { AdminDataList, StatusBadge } from "@/components/admin/module-pages";

export default async function AdminSupportTicketsPage() {
  const db = createDb(env.DATABASE_URL);
  const tickets = await listTickets(db);

  return (
    <AdminDataList
      title="Tickets"
      rows={tickets.map((t) => ({ ...t.ticket, userName: t.userName }))}
      columns={[
        {
          key: "subject",
          header: "Subject",
          render: (t) => (
            <Link href={`/admin/support/tickets/${t.id}`} className="text-accent hover:underline">
              {t.subject}
            </Link>
          ),
        },
        { key: "user", header: "User", render: (t) => t.userName },
        { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
        { key: "priority", header: "Priority", render: (t) => t.priority },
      ]}
    />
  );
}
