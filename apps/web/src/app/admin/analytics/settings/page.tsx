import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminAnalyticsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics Settings</h1>
        <p className="text-muted-foreground">Event collection and external integrations</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Event collection</CardTitle>
          <CardDescription>Raw events stored in analytics_events, aggregated daily by worker</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Worker job: analytics.aggregate</p>
          <p>Track endpoint: POST /api/analytics/track</p>
          <p>Google Analytics: configure GA4 ID in global settings (Phase 7)</p>
        </CardContent>
      </Card>
    </div>
  );
}
