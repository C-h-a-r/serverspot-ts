/**
 * Discord plugin entry point.
 * Role sync and bot notifications are handled via @serverspot/discord in the web app and worker.
 */
export type DiscordPluginConfig = {
  botToken?: string;
  guildId?: string;
};

export function createDiscordPlugin(config: DiscordPluginConfig) {
  return {
    configured: Boolean(config.botToken && config.guildId),
    config,
  };
}
