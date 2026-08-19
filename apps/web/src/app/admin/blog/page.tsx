import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getCmsStats } from "@serverspot/cms";
import { AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminBlogPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getCmsStats(db);

  return (
    <AdminModuleOverview
      title="Blog"
      description="Posts, pages, and content settings"
      stats={[{ label: "Posts", value: stats.posts }]}
      links={[
        { label: "Posts", href: "/admin/blog/posts" },
        { label: "Pages", href: "/admin/blog/pages" },
        { label: "Settings", href: "/admin/blog/settings" },
        { label: "View public blog", href: "/blog" },
      ]}
    />
  );
}
