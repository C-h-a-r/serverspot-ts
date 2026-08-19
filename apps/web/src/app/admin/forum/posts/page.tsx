import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listThreads } from "@serverspot/forum";
import Link from "next/link";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminForumPostsPage() {
  const db = createDb(env.DATABASE_URL);
  const threads = await listThreads(db);

  return (
    <AdminDataList
      title="Threads"
      description="Recent forum threads"
      rows={threads.map((t) => ({ ...t.thread, authorName: t.authorName, categoryName: t.categoryName }))}
      columns={[
        {
          key: "title",
          header: "Title",
          render: (t) => (
            <Link href={`/forum/thread/${t.slug}`} className="text-accent hover:underline">
              {t.title}
            </Link>
          ),
        },
        { key: "author", header: "Author", render: (t) => t.authorName },
        { key: "category", header: "Category", render: (t) => t.categoryName },
        { key: "replies", header: "Replies", render: (t) => t.replyCount },
      ]}
    />
  );
}
