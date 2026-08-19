import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listGameServers } from "@serverspot/game";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminLeaderboardSettingsPage() {
  const db = createDb(env.DATABASE_URL);
  const servers = await listGameServers(db);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard Settings</h1>
        <p className="text-muted-foreground">Data sources and game server connections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Game gateway</CardTitle>
          <CardDescription>Leaderboard stats are pushed via STATS_PUSH messages</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Gateway URL: {env.GAME_GATEWAY_URL ?? "Not configured"}</p>
          <p>Board slugs must match STATS_PUSH boardSlug values from your server plugin.</p>
        </CardContent>
      </Card>

      <AdminDataList
        title="Registered game servers"
        rows={servers}
        emptyMessage="No game servers registered. Use the CLI or API to create one with an API key."
        columns={[
          { key: "name", header: "Name", render: (s) => s.name },
          { key: "status", header: "Status", render: (s) => s.status },
          {
            key: "players",
            header: "Players",
            render: (s) => `${s.playerCount}/${s.maxPlayers}`,
          },
          {
            key: "heartbeat",
            header: "Last seen",
            render: (s) =>
              s.lastHeartbeat ? new Date(s.lastHeartbeat).toLocaleString() : "Never",
          },
        ]}
      />
    </div>
  );
}
