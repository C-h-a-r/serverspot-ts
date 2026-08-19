import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getDailyMetrics } from "@serverspot/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default async function AdminAnalyticsCommunityPage() {
  const db = createDb(env.DATABASE_URL);
  const daily = await getDailyMetrics(db, 30);

  const metrics = ["user.register", "forum.post", "support.ticket", "vote.claim", "application.submit"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Community Analytics</h1>
        <p className="text-muted-foreground">Registrations, forum, support, votes, and applications</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const total = daily.filter((d) => d.metric === metric).reduce((s, d) => s + d.value, 0);
          return (
            <Card key={metric}>
              <CardHeader>
                <CardTitle className="text-base">{metric}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Last 30 days (aggregated)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
