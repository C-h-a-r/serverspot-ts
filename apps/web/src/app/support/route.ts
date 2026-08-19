import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listHelpArticles } from "@serverspot/support";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("support");
  const db = createDb(env.DATABASE_URL);
  const articles = await listHelpArticles(db);

  return renderPublicSpotPage({
    template: "support/index.html",
    extraContext: {
      articles: articles.map((a) => ({
        title: a.article.title,
        slug: a.article.slug,
        category: a.categoryName ?? "",
      })),
    },
  });
}
