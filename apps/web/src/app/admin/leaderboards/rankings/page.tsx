import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getBoardEntries, listBoards } from "@serverspot/game";
import Link from "next/link";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminLeaderboardRankingsPage() {
  const db = createDb(env.DATABASE_URL);
  const boards = await listBoards(db);

  const rows = [];
  for (const board of boards) {
    const entries = await getBoardEntries(db, board.id, 5);
    for (const entry of entries) {
      rows.push({
        id: entry.id,
        board: board.name,
        boardSlug: board.slug,
        player: entry.playerName,
        rank: entry.rank,
        value: entry.value,
      });
    }
  }

  return (
    <AdminDataList
      title="Leaderboard rankings"
      description="Top entries across all boards"
      rows={rows}
      emptyMessage="No leaderboard data yet. Connect a game server and push stats."
      columns={[
        {
          key: "board",
          header: "Board",
          render: (r) => (
            <Link href={`/leaderboards/${r.boardSlug}`} className="text-accent">
              {r.board}
            </Link>
          ),
        },
        { key: "rank", header: "Rank", render: (r) => `#${r.rank}` },
        { key: "player", header: "Player", render: (r) => r.player },
        { key: "value", header: "Value", render: (r) => r.value },
      ]}
    />
  );
}
