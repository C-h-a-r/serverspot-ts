import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listPages } from "@serverspot/cms";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminBlogPagesPage() {
  const db = createDb(env.DATABASE_URL);
  const pages = await listPages(db);

  return (
    <AdminDataList
      title="Custom pages"
      rows={pages}
      columns={[
        { key: "title", header: "Title", render: (p) => p.title },
        { key: "slug", header: "Slug", render: (p) => p.slug },
        { key: "published", header: "Published", render: (p) => (p.published ? "Yes" : "No") },
      ]}
    />
  );
}
