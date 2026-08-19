import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default function AdminSupportAutomationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Automation</h1>
      <Card>
        <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No automation rules configured.</p></CardContent>
      </Card>
    </div>
  );
}
