import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminPlayersSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Player settings</h1>
      <Card>
        <CardHeader><CardTitle>Profile fields</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Configure enabled profile fields and privacy defaults.</p></CardContent>
      </Card>
    </div>
  );
}
