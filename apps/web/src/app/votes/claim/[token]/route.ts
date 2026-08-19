import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getPendingClaimByToken } from "@serverspot/votes";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  await requireModule("votes");
  const { token } = await params;
  const db = createDb(env.DATABASE_URL);
  const pending = await getPendingClaimByToken(db, token);
  const session = await getSession();

  if (!pending) {
    return renderPublicSpotPage({
      template: "votes/claim.html",
      extraContext: {
        claim: { valid: false, message: "This claim link is invalid or has expired." },
      },
    });
  }

  return renderPublicSpotPage({
    template: "votes/claim.html",
    extraContext: {
      claim: {
        valid: true,
        token,
        username: pending.username,
        loggedIn: Boolean(session),
      },
    },
  });
}
