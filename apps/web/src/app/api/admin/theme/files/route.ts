import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getUserPermissions, requirePermission } from "@serverspot/permissions";
import { createDb } from "@serverspot/db";
import { env } from "@serverspot/config/env";
import {
  readThemeEditorFile,
  writeThemeEditorFile,
  deleteThemeEditorFile,
} from "@/lib/theme/editor";
import { getActiveThemeSlug } from "@/lib/theme/config";

const writeSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const deleteSchema = z.object({
  path: z.string().min(1),
});

async function authorize() {
  const authResult = await requireApiSession();
  if (authResult instanceof NextResponse) return authResult;
  const session = authResult;
  const db = createDb(env.DATABASE_URL);
  const perms = await getUserPermissions(db, session.user.id);
  requirePermission(perms, "theme.edit");
  return session;
}

export async function GET(request: Request) {
  const auth = await authorize();
  if (auth instanceof NextResponse) return auth;
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const themeSlug = await getActiveThemeSlug();
  const content = readThemeEditorFile(themeSlug, path);
  return NextResponse.json({ path, content });
}

export async function PUT(request: Request) {
  const auth = await authorize();
  if (auth instanceof NextResponse) return auth;
  const { path, content } = writeSchema.parse(await request.json());
  const themeSlug = await getActiveThemeSlug();
  writeThemeEditorFile(themeSlug, path, content);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await authorize();
  if (auth instanceof NextResponse) return auth;
  const { path } = deleteSchema.parse(await request.json());
  const themeSlug = await getActiveThemeSlug();
  deleteThemeEditorFile(themeSlug, path);
  return NextResponse.json({ success: true });
}
