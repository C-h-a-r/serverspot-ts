import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getLinkedAccounts } from "@serverspot/users";
import { getSession } from "@/lib/auth";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return renderPublicSpotPage({ template: "profile.html", requireAuth: true });
  }

  const db = createDb(env.DATABASE_URL);
  const accounts = await getLinkedAccounts(db, session.user.id);

  return renderPublicSpotPage({
    template: "profile.html",
    requireAuth: true,
    extraContext: {
      linkedAccounts: accounts.map((a) => ({
        platform: a.platform,
        username: a.username,
        verified: a.verified,
      })),
    },
  });
}
