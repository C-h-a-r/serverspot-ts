import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getUserPermissions, requirePermission } from "@serverspot/permissions";
import { createDb } from "@serverspot/db";
import { env } from "@serverspot/config/env";
import { saveThemeConfigValue, getActiveThemeSlug } from "@/lib/theme/config";

const bodySchema = z.record(z.string());

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;

  const db = createDb(env.DATABASE_URL);
  const perms = await getUserPermissions(db, session.user.id);
  requirePermission(perms, "settings.manage");

  const json = bodySchema.parse(await request.json());
  const themeSlug = await getActiveThemeSlug();

  for (const [optionId, value] of Object.entries(json)) {
    await saveThemeConfigValue(themeSlug, optionId, value);
  }

  return NextResponse.json({ success: true });
}
