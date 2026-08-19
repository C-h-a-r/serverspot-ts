export function formatGiveCommand(item: string, amount = 1, player?: string): string {
  const target = player ?? "@p";
  return `give ${target} ${item} ${amount}`;
}

export function formatRankCommand(rank: string, player: string): string {
  return `lp user ${player} parent set ${rank}`;
}

export function formatBroadcast(message: string): string {
  return `say ${message.replace(/"/g, '\\"')}`;
}

export function formatVoteRewardCommands(username: string, commands: string[]): string[] {
  return commands.map((cmd) => cmd.replace(/\{player\}/g, username));
}

export function normalizeMinecraftUsername(username: string): string {
  return username.trim();
}

export function isValidMinecraftUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}
