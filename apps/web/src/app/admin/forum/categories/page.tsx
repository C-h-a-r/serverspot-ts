import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listCategories } from "@serverspot/forum";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminForumCategoriesPage() {
  const db = createDb(env.DATABASE_URL);
  const categories = await listCategories(db);

  return (
    <AdminDataList
      title="Forum categories"
      rows={categories}
      columns={[
        { key: "name", header: "Name", render: (c) => c.name },
        { key: "slug", header: "Slug", render: (c) => c.slug },
        { key: "visibility", header: "Visibility", render: (c) => c.visibility },
      ]}
      emptyMessage="No categories yet. Seed demo data or create via API."
    />
  );
}
