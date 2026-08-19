import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listBoards } from "@serverspot/game";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("leaderboards");
  const db = createDb(env.DATABASE_URL);
  const boards = await listBoards(db, true);

  return renderPublicSpotPage({
    template: "leaderboards/index.html",
    extraContext: {
      boards: boards.map((b) => ({
        name: b.name,
        slug: b.slug,
        description: b.description ?? "",
        lastSync: b.lastSyncAt ? new Date(b.lastSyncAt).toLocaleString() : "Never",
      })),
    },
  });
}
