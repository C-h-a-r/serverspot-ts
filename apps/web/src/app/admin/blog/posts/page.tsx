import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listPosts } from "@serverspot/cms";
import Link from "next/link";
import { AdminDataList, StatusBadge } from "@/components/admin/module-pages";

export default async function AdminBlogPostsPage() {
  const db = createDb(env.DATABASE_URL);
  const posts = await listPosts(db);

  return (
    <AdminDataList
      title="Blog posts"
      createHref="/admin/blog/posts/new"
      createLabel="New post"
      rows={posts.map((p) => ({ ...p.post, authorName: p.authorName }))}
      columns={[
        {
          key: "title",
          header: "Title",
          render: (p) => (
            <Link href={`/blog/${p.slug}`} className="text-accent hover:underline">
              {p.title}
            </Link>
          ),
        },
        { key: "author", header: "Author", render: (p) => p.authorName },
        { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
      ]}
    />
  );
}
