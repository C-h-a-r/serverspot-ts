import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground">Cross-module activity feed and audit trail.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Orders, tickets, forum posts, votes, and applications</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
