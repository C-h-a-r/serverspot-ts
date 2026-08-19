import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { createWebhook } from "@serverspot/developer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = createDb(env.DATABASE_URL);
  const result = await createWebhook(db, {
    userId: session.user.id,
    url: parsed.data.url,
    events: parsed.data.events,
  });

  return NextResponse.json({
    id: result.webhook.id,
    secret: result.secret,
  });
}
