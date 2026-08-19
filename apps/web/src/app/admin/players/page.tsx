import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getPlayerStats } from "@serverspot/users";
import { AdminModuleOverview } from "@/components/admin/module-pages";

export default async function AdminPlayersPage() {
  const db = createDb(env.DATABASE_URL);
  const stats = await getPlayerStats(db);

  return (
    <AdminModuleOverview
      title="Players"
      description="Profiles, linked accounts, and player settings"
      stats={[{ label: "Profiles", value: stats.profiles }]}
      links={[
        { label: "Profiles", href: "/admin/players/profiles" },
        { label: "Settings", href: "/admin/players/settings" },
        { label: "View player directory", href: "/players" },
      ]}
    />
  );
}
