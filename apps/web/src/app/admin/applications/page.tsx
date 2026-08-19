import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getApplicationStats, listForms, listSubmissions } from "@serverspot/applications";
import { AdminDataList, AdminModuleOverview } from "@/components/admin/module-pages";
import Link from "next/link";

export default async function AdminApplicationsPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getApplicationStats(db);
  const forms = await listForms(db);

  return (
    <AdminModuleOverview
      title="Applications"
      description="Staff recruitment forms and submissions"
      stats={[
        { label: "Forms", value: stats.forms },
        { label: "Submissions", value: stats.submissions },
        { label: "Open forms", value: forms.filter((f) => f.status === "open").length },
      ]}
      links={[
        { label: "Inbox", href: "/admin/applications/inbox" },
        { label: "Settings", href: "/admin/applications/settings" },
      ]}
    />
  );
}
