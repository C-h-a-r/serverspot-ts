import type { Database } from "@serverspot/db";
import { gameLinkCodes } from "@serverspot/db/schema";
import { generateToken } from "@serverspot/utils";
import { and, eq, gt, isNull } from "drizzle-orm";

const CODE_TTL_MS = 15 * 60_000;

export function generateLinkCode(): string {
  return generateToken(6).toUpperCase();
}

export async function createLinkCodeFromGame(
  db: Database,
  input: {
    serverId?: string | null;
    playerUuid: string;
    username: string;
    code?: string;
  },
) {
  const code = input.code?.toUpperCase() ?? generateLinkCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  const [record] = await db
    .insert(gameLinkCodes)
    .values({
      code,
      serverId: input.serverId ?? null,
      playerUuid: input.playerUuid,
      username: input.username,
      expiresAt,
    })
    .returning();

  return record!;
}

export async function getValidLinkCode(db: Database, code: string) {
  const [record] = await db
    .select()
    .from(gameLinkCodes)
    .where(
      and(
        eq(gameLinkCodes.code, code.toUpperCase()),
        isNull(gameLinkCodes.usedAt),
        gt(gameLinkCodes.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return record ?? null;
}

export async function markLinkCodeUsed(db: Database, codeId: string, userId: string) {
  const [record] = await db
    .update(gameLinkCodes)
    .set({ userId, usedAt: new Date() })
    .where(eq(gameLinkCodes.id, codeId))
    .returning();
  return record ?? null;
}
