import { env } from "@serverspot/config/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminVoteSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vote Settings</h1>
        <p className="text-muted-foreground">Callback URLs and reward configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vote callbacks</CardTitle>
          <CardDescription>Configure vote sites to POST/GET to these URLs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-sm text-muted-foreground">
          <p>GET /api/webhooks/vote/[site-slug]?username=...&token=...</p>
          <p>Players claim at /votes/claim/[token]</p>
        </CardContent>
      </Card>
    </div>
  );
}
