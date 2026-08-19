import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listProfiles } from "@serverspot/users";
import Link from "next/link";
import { AdminDataList } from "@/components/admin/module-pages";

export default async function AdminPlayerProfilesPage() {
  const db = createDb(env.DATABASE_URL);
  const profiles = await listProfiles(db);

  return (
    <AdminDataList
      title="Player profiles"
      rows={profiles.map((p) => ({ ...p.profile, email: p.email }))}
      columns={[
        {
          key: "name",
          header: "Display name",
          render: (p) => (
            <Link href={`/players/${p.slug}`} className="text-accent hover:underline">
              {p.displayName}
            </Link>
          ),
        },
        { key: "email", header: "Email", render: (p) => p.email },
        { key: "privacy", header: "Privacy", render: (p) => p.privacy },
        { key: "playtime", header: "Playtime", render: (p) => `${p.playtime ?? 0}m` },
      ]}
    />
  );
}
