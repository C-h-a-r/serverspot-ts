import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listCategories, listThreads } from "@serverspot/forum";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("forum");
  const db = createDb(env.DATABASE_URL);
  const categories = await listCategories(db);
  const threads = await listThreads(db);

  return renderPublicSpotPage({
    template: "forum/index.html",
    extraContext: {
      categories: categories.map((c) => ({ name: c.name, slug: c.slug, description: c.description ?? "" })),
      threads: threads.slice(0, 20).map((t) => ({
        title: t.thread.title,
        slug: t.thread.slug,
        author: t.authorName,
        category: t.categoryName,
        replies: t.thread.replyCount,
      })),
    },
  });
}
