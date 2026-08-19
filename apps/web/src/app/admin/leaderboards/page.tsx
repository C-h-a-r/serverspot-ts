import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getLeaderboardStats, listBoards } from "@serverspot/game";
import { AdminDataList, AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminLeaderboardsPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getLeaderboardStats(db);
  const boards = await listBoards(db);

  return (
    <AdminModuleOverview
      title="Leaderboards"
      description="Player rankings synced from game servers"
      stats={[
        { label: "Boards", value: stats.boards },
        { label: "Synced", value: boards.filter((b) => b.lastSyncAt).length },
      ]}
      links={[
        { label: "View rankings", href: "/admin/leaderboards/rankings" },
        { label: "Settings", href: "/admin/leaderboards/settings" },
      ]}
    />
  );
}
