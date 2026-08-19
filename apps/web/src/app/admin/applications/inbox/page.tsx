import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listSubmissions } from "@serverspot/applications";
import Link from "next/link";
import { AdminDataList, StatusBadge } from "@/components/admin/module-pages";

export default async function AdminApplicationsInboxPage() {
  const db = createDb(env.DATABASE_URL);
  const submissions = await listSubmissions(db);

  return (
    <AdminDataList
      title="Application inbox"
      description="Review and decide on submissions"
      rows={submissions}
      emptyMessage="No submissions yet."
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          render: (s) => (
            <Link href={`/admin/applications/inbox/${s.id}`} className="text-accent">
              {s.applicantName}
            </Link>
          ),
        },
        { key: "email", header: "Email", render: (s) => s.applicantEmail },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
        {
          key: "date",
          header: "Submitted",
          render: (s) => new Date(s.createdAt).toLocaleDateString(),
        },
      ]}
    />
  );
}
