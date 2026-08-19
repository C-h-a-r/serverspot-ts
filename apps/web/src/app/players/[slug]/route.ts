import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getLinkedAccounts, getProfileBySlug } from "@serverspot/users";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("players");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const profile = await getProfileBySlug(db, slug);
  if (!profile || profile.profile.privacy === "private") notFound();

  const linked = await getLinkedAccounts(db, profile.profile.userId);

  return renderPublicSpotPage({
    template: "players/profile.html",
    extraContext: {
      item: {
        name: profile.profile.displayName,
        bio: profile.profile.bio ?? "",
        playtime: profile.profile.playtime ?? 0,
        joinDate: profile.profile.joinDate?.toISOString() ?? "",
        linkedAccounts: linked.map((a) => ({
          platform: a.platform,
          username: a.username,
          verified: a.verified,
        })),
      },
    },
  });
}
