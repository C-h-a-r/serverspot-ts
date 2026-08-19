import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { isDiscordConfigured, getDiscordConfig } from "@serverspot/discord";
import { listApiKeys, listWebhooks } from "@serverspot/developer";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";
import { requireSession } from "@/lib/auth";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminDeveloperSettingsPage() {
  const session = await requireSession();
  const db = createDb(env.DATABASE_URL);
  const apiKeys = await listApiKeys(db, session.user.id);
  const webhooks = await listWebhooks(db, session.user.id);
  const discord = await getDiscordConfig(db);

  const discordConfig = {
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: discord.guild?.guildId ?? process.env.DISCORD_GUILD_ID,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Developer Platform</h1>
        <p className="text-muted-foreground">API keys, webhooks, and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>REST API</CardTitle>
          <CardDescription>Bearer token authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm text-muted-foreground">
          <p>GET /api/v1/products</p>
          <p>GET /api/v1/orders</p>
        </CardContent>
      </Card>

      <AdminDataList
        title="API keys"
        description="Your API keys (prefix only — secrets shown once at creation)"
        rows={apiKeys}
        emptyMessage="No API keys yet. Create one via POST /api/admin/developer/keys"
        columns={[
          { key: "name", header: "Name", render: (k) => k.name },
          { key: "prefix", header: "Prefix", render: (k) => <code>{k.keyPrefix}…</code> },
          {
            key: "scopes",
            header: "Scopes",
            render: (k) => (k.scopes as string[]).join(", "),
          },
          {
            key: "active",
            header: "Status",
            render: (k) => (
              <Badge variant={k.active ? "default" : "secondary"}>
                {k.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
        ]}
      />

      <AdminDataList
        title="Webhooks"
        rows={webhooks}
        emptyMessage="No webhooks configured."
        columns={[
          { key: "url", header: "URL", render: (w) => w.url },
          {
            key: "events",
            header: "Events",
            render: (w) => (w.events as string[]).join(", "),
          },
          {
            key: "active",
            header: "Status",
            render: (w) => (
              <Badge variant={w.active ? "default" : "secondary"}>
                {w.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Discord integration</CardTitle>
          <CardDescription>OAuth login configured in auth — bot features below</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant={isDiscordConfigured(discordConfig) ? "default" : "secondary"}>
            {isDiscordConfigured(discordConfig) ? "Bot configured" : "Bot not configured"}
          </Badge>
          {discord.guild && (
            <p className="mt-2 text-sm text-muted-foreground">
              Guild: {discord.guild.guildName ?? discord.guild.guildId}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Role mappings: {discord.mappings.length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
