import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getDiscordConfig, isDiscordConfigured } from "@serverspot/discord";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@serverspot/ui";
import Link from "next/link";

export default async function AdminIntegrationsPage() {
  const db = createDb(env.DATABASE_URL);
  const discord = await getDiscordConfig(db);
  const discordConfig = {
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: discord.guild?.guildId ?? process.env.DISCORD_GUILD_ID,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-muted-foreground">Discord bot, OAuth, and third-party services</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>OAuth login + bot role sync and channel notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={env.DISCORD_CLIENT_ID ? "default" : "secondary"}>
              OAuth {env.DISCORD_CLIENT_ID ? "configured" : "not configured"}
            </Badge>
            <Badge variant={isDiscordConfigured(discordConfig) ? "default" : "secondary"}>
              Bot {isDiscordConfigured(discordConfig) ? "configured" : "not configured"}
            </Badge>
          </div>
          {discord.guild && (
            <p className="text-muted-foreground">
              Guild: {discord.guild.guildName ?? discord.guild.guildId}
            </p>
          )}
          <p className="text-muted-foreground">Role mappings: {discord.mappings.length}</p>
          <p className="text-muted-foreground">
            Triggers: order.completed, vote.claimed, application.accepted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developer platform</CardTitle>
          <CardDescription>REST API keys and outbound webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/settings/developer" className="text-sm text-accent">
            Manage API keys and webhooks →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
