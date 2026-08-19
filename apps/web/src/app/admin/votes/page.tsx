import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getVoteStats, listVoteSites } from "@serverspot/votes";
import { AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminVotesPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getVoteStats(db);
  const sites = await listVoteSites(db);

  return (
    <AdminModuleOverview
      title="Vote Rewards"
      description="Vote site callbacks and player claims"
      stats={[
        { label: "Sites", value: stats.sites },
        { label: "Claims", value: stats.claims },
        { label: "Enabled", value: sites.filter((s) => s.enabled).length },
      ]}
      links={[
        { label: "Recent claims", href: "/admin/votes/rewards" },
        { label: "Settings", href: "/admin/votes/settings" },
      ]}
    />
  );
}
