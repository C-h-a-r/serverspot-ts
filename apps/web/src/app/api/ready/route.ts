import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = createDb(env.DATABASE_URL);
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "not_ready", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
