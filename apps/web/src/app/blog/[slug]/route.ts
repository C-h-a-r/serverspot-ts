import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getPostBySlug } from "@serverspot/cms";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("blog");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const post = await getPostBySlug(db, slug);
  if (!post || post.post.status !== "published") notFound();

  return renderPublicSpotPage({
    template: "blog/post.html",
    extraContext: {
      item: {
        title: post.post.title,
        body: post.post.body,
        author: post.authorName,
        excerpt: post.post.excerpt ?? "",
        publishedAt: post.post.publishedAt?.toISOString() ?? "",
      },
    },
  });
}
