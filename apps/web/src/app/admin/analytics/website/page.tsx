import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getDailyMetrics } from "@serverspot/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default async function AdminAnalyticsWebsitePage() {
  const db = createDb(env.DATABASE_URL);
  const daily = await getDailyMetrics(db, 14);
  const pageViews = daily.filter((d) => d.metric === "page.view");

  const max = Math.max(...pageViews.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Website Analytics</h1>
        <p className="text-muted-foreground">Page views and traffic over the last 14 days</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily page views</CardTitle>
        </CardHeader>
        <CardContent>
          {pageViews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No page view data yet. Events are tracked via /api/analytics/track.
            </p>
          ) : (
            <div className="flex h-48 items-end gap-2">
              {pageViews.map((d) => (
                <div key={d.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-accent/60"
                    style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
                    title={`${d.date}: ${d.value}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
