import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminBlogSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Blog settings</h1>
      <Card>
        <CardHeader><CardTitle>Public path</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Default: /blog (alias /news configurable in Phase 6)</p></CardContent>
      </Card>
    </div>
  );
}
