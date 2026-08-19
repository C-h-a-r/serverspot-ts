import type { Database } from "@serverspot/db";
import {
  leaderboardBoards,
  leaderboardEntries,
  leaderboardSnapshots,
} from "@serverspot/db/schema";
import { eq } from "drizzle-orm";

export async function listBoards(db: Database, visibleOnly = false) {
  if (visibleOnly) {
    return db
      .select()
      .from(leaderboardBoards)
      .where(eq(leaderboardBoards.visible, true))
      .orderBy(leaderboardBoards.name);
  }
  return db.select().from(leaderboardBoards).orderBy(leaderboardBoards.name);
}

export async function getBoardBySlug(db: Database, slug: string) {
  const [board] = await db
    .select()
    .from(leaderboardBoards)
    .where(eq(leaderboardBoards.slug, slug))
    .limit(1);
  return board ?? null;
}

export async function getBoardEntries(db: Database, boardId: string, limit = 10) {
  return db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.boardId, boardId))
    .orderBy(leaderboardEntries.rank)
    .limit(limit);
}

export async function syncBoardEntries(
  db: Database,
  boardSlug: string,
  entries: { playerUuid?: string; playerName: string; value: number }[],
) {
  const board = await getBoardBySlug(db, boardSlug);
  if (!board) throw new Error(`Board not found: ${boardSlug}`);

  const sorted = [...entries].sort((a, b) =>
    board.sortDirection === "asc" ? a.value - b.value : b.value - a.value,
  );

  const limited = sorted.slice(0, board.displayLimit);

  await db.delete(leaderboardEntries).where(eq(leaderboardEntries.boardId, board.id));

  if (limited.length > 0) {
    await db.insert(leaderboardEntries).values(
      limited.map((entry, index) => ({
        boardId: board.id,
        playerUuid: entry.playerUuid ?? null,
        playerName: entry.playerName,
        value: String(entry.value),
        rank: index + 1,
      })),
    );
  }

  await db.insert(leaderboardSnapshots).values({
    boardId: board.id,
    entries: limited,
  });

  await db
    .update(leaderboardBoards)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(leaderboardBoards.id, board.id));

  return board;
}

export async function createBoard(
  db: Database,
  input: {
    name: string;
    slug?: string;
    description?: string;
    statKey?: string;
    displayLimit?: number;
  },
) {
  const slug =
    input.slug ??
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const [board] = await db
    .insert(leaderboardBoards)
    .values({
      name: input.name,
      slug,
      description: input.description,
      statKey: input.statKey ?? "value",
      displayLimit: input.displayLimit ?? 10,
    })
    .returning();

  return board!;
}

export async function getLeaderboardStats(db: Database) {
  const boards = await listBoards(db);
  return { boards: boards.length };
}
