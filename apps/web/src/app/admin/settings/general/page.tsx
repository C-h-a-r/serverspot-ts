import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function SettingsGeneralPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-muted-foreground">Site name, branding, maintenance mode, and locale.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Site Configuration</CardTitle>
          <CardDescription>Global settings stored in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Settings UI will be implemented in Phase 2 alongside theme configuration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
