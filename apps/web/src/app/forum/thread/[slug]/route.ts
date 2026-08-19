import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getThreadBySlug, getThreadPosts } from "@serverspot/forum";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("forum");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const thread = await getThreadBySlug(db, slug);
  if (!thread) notFound();

  const posts = await getThreadPosts(db, thread.thread.id);

  return renderPublicSpotPage({
    template: "forum/thread.html",
    extraContext: {
      thread: {
        title: thread.thread.title,
        slug: thread.thread.slug,
        author: thread.authorName,
        category: thread.categoryName,
        locked: thread.thread.locked,
      },
      posts: posts.map((p) => ({
        author: p.authorName,
        body: p.post.body,
        createdAt: p.post.createdAt.toISOString(),
      })),
    },
  });
}
