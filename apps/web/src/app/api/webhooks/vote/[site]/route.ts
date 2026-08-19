import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getVoteSiteBySlug, recordVoteCallback } from "@serverspot/votes";
import { verifyMinecraftMpCallback, parseVoteCallbackQuery } from "@serverspot/minecraft";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ site: string }> },
) {
  const { site: siteSlug } = await params;
  const db = createDb(env.DATABASE_URL);
  const site = await getVoteSiteBySlug(db, siteSlug);

  if (!site || !site.enabled) {
    return NextResponse.json({ error: "Unknown vote site" }, { status: 404 });
  }

  const url = new URL(request.url);
  const callback = parseVoteCallbackQuery(url.searchParams);

  if (!callback.username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  let verified = site.callbackMethod === "ip";
  if (site.callbackMethod === "hmac" && site.secret) {
    verified = verifyMinecraftMpCallback(callback, site.secret);
  } else if (site.callbackMethod === "token" && site.secret) {
    verified = callback.token === site.secret;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const result = await recordVoteCallback(db, {
    siteId: site.id,
    username: callback.username,
    ipAddress: ip,
    verified,
    rawPayload: Object.fromEntries(url.searchParams.entries()),
  });

  return NextResponse.json({
    ok: verified,
    claimToken: result.pendingClaim?.claimToken,
  });
}
