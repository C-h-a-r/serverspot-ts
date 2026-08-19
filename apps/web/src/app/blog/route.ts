import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listPosts } from "@serverspot/cms";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("blog");
  const db = createDb(env.DATABASE_URL);
  const posts = await listPosts(db, true);

  return renderPublicSpotPage({
    template: "blog/index.html",
    extraContext: {
      items: posts.map((p) => ({
        title: p.post.title,
        slug: p.post.slug,
        excerpt: p.post.excerpt ?? "",
        author: p.authorName,
        publishedAt: p.post.publishedAt?.toISOString() ?? "",
      })),
    },
  });
}
