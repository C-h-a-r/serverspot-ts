import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminApplicationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Application Settings</h1>
        <p className="text-muted-foreground">Form defaults and notification options</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
          <CardDescription>Demo staff form is seeded — create more via the applications API</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Public URL: /applications</p>
          <p>Review workflow supports accept, deny, and staff voting.</p>
        </CardContent>
      </Card>
    </div>
  );
}
