import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { createApiKey } from "@serverspot/developer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";

const keySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(["read"]),
});

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = keySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = createDb(env.DATABASE_URL);
  const result = await createApiKey(db, {
    userId: session.user.id,
    name: parsed.data.name,
    scopes: parsed.data.scopes,
  });

  return NextResponse.json({
    id: result.apiKey.id,
    prefix: result.apiKey.keyPrefix,
    secret: result.secret,
  });
}
