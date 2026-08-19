import { createHash, randomBytes } from "node:crypto";
import type { Database } from "@serverspot/db";
import { gameServers } from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { eq } from "drizzle-orm";

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function generateApiKey(): string {
  return `ssg_${randomBytes(24).toString("hex")}`;
}

export async function createGameServer(db: Database, input: { name: string; game?: string }) {
  const apiKey = generateApiKey();
  const [server] = await db
    .insert(gameServers)
    .values({
      name: input.name,
      slug: slugify(input.name),
      game: input.game ?? "minecraft",
      apiKeyHash: hashApiKey(apiKey),
    })
    .returning();

  return { server: server!, apiKey };
}

export async function authenticateServer(db: Database, apiKey: string) {
  const hash = hashApiKey(apiKey);
  const [server] = await db
    .select()
    .from(gameServers)
    .where(eq(gameServers.apiKeyHash, hash))
    .limit(1);
  return server ?? null;
}

export async function updateServerHeartbeat(
  db: Database,
  serverId: string,
  opts: { playerCount: number; maxPlayers?: number },
) {
  await db
    .update(gameServers)
    .set({
      status: "online",
      playerCount: opts.playerCount,
      maxPlayers: opts.maxPlayers ?? 0,
      lastHeartbeat: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(gameServers.id, serverId));
}

export async function markServerOffline(db: Database, serverId: string) {
  await db
    .update(gameServers)
    .set({ status: "offline", updatedAt: new Date() })
    .where(eq(gameServers.id, serverId));
}

export async function listGameServers(db: Database) {
  return db.select().from(gameServers).orderBy(gameServers.name);
}

export async function getGameServerById(db: Database, id: string) {
  const [server] = await db.select().from(gameServers).where(eq(gameServers.id, id)).limit(1);
  return server ?? null;
}
