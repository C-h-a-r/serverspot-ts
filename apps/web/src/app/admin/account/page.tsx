import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminAccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground">Manage your staff profile and security settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile & Security</CardTitle>
          <CardDescription>
            Password change, 2FA, sessions, and notification preferences — coming in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Account management features will be available once auth settings are fully implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
