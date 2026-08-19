import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminForumModerationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Moderation</h1>
      <Card>
        <CardHeader><CardTitle>Report queue</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No reports pending.</p></CardContent>
      </Card>
    </div>
  );
}
