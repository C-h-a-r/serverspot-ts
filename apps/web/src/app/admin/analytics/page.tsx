import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getAnalyticsSummary, getRecentEvents } from "@serverspot/analytics";
import { AdminModuleOverview } from "@/components/admin/module-pages";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default async function AdminAnalyticsPage() {
  const db = createDb(env.DATABASE_URL);
  const summary = await getAnalyticsSummary(db);
  const recent = await getRecentEvents(db, 5);

  return (
    <div className="space-y-6">
      <AdminModuleOverview
        title="Analytics"
        description="Website, community, and gaming metrics"
        stats={[
          { label: "Total events", value: summary.totalEvents },
          { label: "Page views (7d)", value: summary.pageViews7d },
          { label: "Registrations (7d)", value: summary.registrations7d },
        ]}
        links={[
          { label: "Website", href: "/admin/analytics/website" },
          { label: "Community", href: "/admin/analytics/community" },
          { label: "Gaming", href: "/admin/analytics/gaming" },
          { label: "Settings", href: "/admin/analytics/settings" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recent.length === 0 ? (
            <p className="text-muted-foreground">No events recorded yet.</p>
          ) : (
            recent.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-border py-2 last:border-0">
                <span>{e.eventType}</span>
                <span className="text-muted-foreground">{e.path ?? e.module ?? "—"}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Link href="/analytics" className="text-sm text-accent">
        View public analytics page →
      </Link>
    </div>
  );
}
