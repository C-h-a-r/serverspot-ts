import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getSupportStats } from "@serverspot/support";
import { AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminSupportPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getSupportStats(db);

  return (
    <AdminModuleOverview
      title="Support"
      description="Tickets, help centre, and automation"
      stats={[{ label: "Open tickets", value: stats.openTickets }]}
      links={[
        { label: "Tickets", href: "/admin/support/tickets" },
        { label: "Help centre", href: "/admin/support/help" },
        { label: "Automation", href: "/admin/support/automation" },
        { label: "View support portal", href: "/support" },
      ]}
    />
  );
}
