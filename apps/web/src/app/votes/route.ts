import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getTopVoters, listVoteSites } from "@serverspot/votes";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("votes");
  const db = createDb(env.DATABASE_URL);
  const sites = await listVoteSites(db, true);
  const topVoters = await getTopVoters(db, 10);

  return renderPublicSpotPage({
    template: "votes/index.html",
    extraContext: {
      sites: sites.map((s) => ({
        name: s.name,
        slug: s.slug,
        voteUrl: s.voteUrl,
      })),
      topVoters: topVoters.map((v) => ({
        username: v.username,
        streak: v.currentStreak,
        longest: v.longestStreak,
      })),
    },
  });
}
