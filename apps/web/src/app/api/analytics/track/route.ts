import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { trackEventSchema, trackEvent } from "@serverspot/analytics";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = createDb(env.DATABASE_URL);
  await trackEvent(db, parsed.data);
  return NextResponse.json({ ok: true });
}
