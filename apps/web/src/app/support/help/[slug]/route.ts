import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getHelpArticleBySlug } from "@serverspot/support";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("support");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const article = await getHelpArticleBySlug(db, slug);
  if (!article || !article.article.published) notFound();

  return renderPublicSpotPage({
    template: "support/help-article.html",
    extraContext: {
      item: {
        title: article.article.title,
        body: article.article.body,
        category: article.categoryName ?? "",
      },
    },
  });
}
