import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listRecentClaims } from "@serverspot/votes";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminVoteRewardsPage() {
  const db = createDb(env.DATABASE_URL);
  const claims = await listRecentClaims(db);

  return (
    <AdminDataList
      title="Vote claims"
      description="Recent reward claims"
      rows={claims}
      emptyMessage="No claims yet."
      columns={[
        { key: "username", header: "Player", render: (c) => c.username },
        { key: "type", header: "Reward", render: (c) => c.rewardType },
        {
          key: "created",
          header: "Claimed",
          render: (c) => new Date(c.createdAt).toLocaleString(),
        },
      ]}
    />
  );
}
