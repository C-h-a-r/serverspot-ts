import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listHelpArticles } from "@serverspot/support";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminSupportHelpPage() {
  const db = createDb(env.DATABASE_URL);
  const articles = await listHelpArticles(db, false);

  return (
    <AdminDataList
      title="Help centre"
      description="FAQ and support articles"
      rows={articles.map((a) => ({ ...a.article, categoryName: a.categoryName ?? "—" }))}
      columns={[
        { key: "title", header: "Title", render: (a) => a.title },
        { key: "category", header: "Category", render: (a) => a.categoryName },
        {
          key: "published",
          header: "Published",
          render: (a) => (a.published ? "Yes" : "Draft"),
        },
      ]}
    />
  );
}
