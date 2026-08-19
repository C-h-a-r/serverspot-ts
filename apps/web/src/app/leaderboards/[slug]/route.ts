import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getBoardBySlug, getBoardEntries } from "@serverspot/game";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("leaderboards");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const board = await getBoardBySlug(db, slug);
  if (!board || !board.visible) notFound();

  const entries = await getBoardEntries(db, board.id, board.displayLimit);

  return renderPublicSpotPage({
    template: "leaderboards/board.html",
    extraContext: {
      board: {
        name: board.name,
        slug: board.slug,
        description: board.description ?? "",
      },
      entries: entries.map((e) => ({
        rank: e.rank,
        player: e.playerName,
        value: e.value,
      })),
    },
  });
}
