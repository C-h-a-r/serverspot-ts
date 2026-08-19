import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getForumStats } from "@serverspot/forum";
import { AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminForumPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getForumStats(db);

  return (
    <AdminModuleOverview
      title="Forum"
      description="Categories, threads, and moderation"
      stats={[
        { label: "Threads", value: stats.threads },
        { label: "Posts", value: stats.posts },
      ]}
      links={[
        { label: "Categories", href: "/admin/forum/categories" },
        { label: "Threads & posts", href: "/admin/forum/posts" },
        { label: "Moderation", href: "/admin/forum/moderation" },
        { label: "View public forum", href: "/forum" },
      ]}
    />
  );
}
