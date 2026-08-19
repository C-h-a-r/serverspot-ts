import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getValidLinkCode, markLinkCodeUsed } from "@serverspot/game";
import { getLinkedAccounts, linkGameAccount } from "@serverspot/users";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";

const linkSchema = z.object({ code: z.string().min(4).max(12) });

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const db = createDb(env.DATABASE_URL);
  const accounts = await getLinkedAccounts(db, session.user.id);

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      platform: a.platform,
      username: a.username,
      verified: a.verified,
      isPrimary: a.isPrimary,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const db = createDb(env.DATABASE_URL);
  const record = await getValidLinkCode(db, parsed.data.code);
  if (!record) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  await markLinkCodeUsed(db, record.id, session.user.id);

  const account = await linkGameAccount(db, {
    userId: session.user.id,
    platform: "minecraft",
    username: record.username,
    uuid: record.playerUuid,
  });

  return NextResponse.json({
    account: {
      id: account.id,
      platform: account.platform,
      username: account.username,
      verified: account.verified,
    },
  });
}
