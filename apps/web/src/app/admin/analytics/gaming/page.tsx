import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getDailyMetrics } from "@serverspot/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default async function AdminAnalyticsGamingPage() {
  const db = createDb(env.DATABASE_URL);
  const daily = await getDailyMetrics(db, 30);

  const metrics = [
    { key: "game.link", label: "Account links" },
    { key: "vote.claim", label: "Vote claims" },
    { key: "leaderboard.sync", label: "Leaderboard syncs" },
    { key: "order.completed", label: "Store purchases" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gaming Analytics</h1>
        <p className="text-muted-foreground">Game linking, votes, leaderboards, and store activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ key, label }) => {
          const total = daily.filter((d) => d.metric === key).reduce((s, d) => s + d.value, 0);
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
