import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { claimVoteReward } from "@serverspot/votes";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { onVoteClaimed } from "@/lib/integrations";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const session = await getSession();
  const db = createDb(env.DATABASE_URL);

  try {
    const result = await claimVoteReward(db, {
      token: body.token,
      userId: session?.user.id,
    });

    await onVoteClaimed(db, {
      id: result.claim.id,
      userId: result.claim.userId,
      username: result.claim.username,
    });

    return NextResponse.json({
      ok: true,
      username: result.claim.username,
      reward: result.reward?.payload ?? result.claim.rewardPayload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claim failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
