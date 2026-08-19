import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listProfiles } from "@serverspot/users";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("players");
  const db = createDb(env.DATABASE_URL);
  const profiles = await listProfiles(db, true);

  return renderPublicSpotPage({
    template: "players/index.html",
    extraContext: {
      items: profiles.map((p) => ({
        name: p.profile.displayName,
        slug: p.profile.slug,
        bio: p.profile.bio ?? "",
        playtime: p.profile.playtime ?? 0,
      })),
    },
  });
}
