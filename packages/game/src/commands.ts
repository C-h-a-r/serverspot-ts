import type { Database } from "@serverspot/db";
import { gameCommands } from "@serverspot/db/schema";
import { eq, inArray } from "drizzle-orm";

export type CommandPayload = {
  commands: string[];
  playerUuid?: string;
  username?: string;
  orderId?: string;
  fulfillmentId?: string;
};

export async function enqueueGameCommand(
  db: Database,
  input: {
    serverId?: string | null;
    type: string;
    payload: CommandPayload;
    orderId?: string;
    fulfillmentId?: string;
  },
) {
  const [command] = await db
    .insert(gameCommands)
    .values({
      serverId: input.serverId ?? null,
      type: input.type,
      payload: input.payload,
      orderId: input.orderId ?? null,
      fulfillmentId: input.fulfillmentId ?? null,
      status: "pending",
    })
    .returning();

  return command!;
}

export async function getPendingCommands(db: Database, serverId: string) {
  return db
    .select()
    .from(gameCommands)
    .where(eq(gameCommands.serverId, serverId))
    .orderBy(gameCommands.createdAt);
}

export async function markCommandSent(db: Database, commandId: string) {
  await db
    .update(gameCommands)
    .set({ status: "sent" })
    .where(eq(gameCommands.id, commandId));
}

export async function completeCommand(
  db: Database,
  commandId: string,
  result: { success: boolean; output?: string; error?: string },
) {
  await db
    .update(gameCommands)
    .set({
      status: result.success ? "completed" : "failed",
      result,
      error: result.error ?? null,
      processedAt: new Date(),
    })
    .where(eq(gameCommands.id, commandId));
}

export async function getCommandsByIds(db: Database, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(gameCommands).where(inArray(gameCommands.id, ids));
}
