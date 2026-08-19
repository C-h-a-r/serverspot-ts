import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getAnalyticsSummary } from "@serverspot/analytics";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("analytics");
  const db = createDb(env.DATABASE_URL);
  const summary = await getAnalyticsSummary(db);

  return renderPublicSpotPage({
    template: "analytics/index.html",
    extraContext: {
      stats: {
        pageViews: summary.pageViews7d,
        registrations: summary.registrations7d,
        totalEvents: summary.totalEvents,
      },
    },
  });
}
