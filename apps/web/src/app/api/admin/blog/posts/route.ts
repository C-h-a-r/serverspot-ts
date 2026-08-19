import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createDb } from "@serverspot/db";
import { env } from "@serverspot/config/env";
import { getUserPermissions, requireAnyPermission } from "@serverspot/permissions";
import { createPost, postInputSchema } from "@serverspot/cms";

const createSchema = postInputSchema.omit({ authorId: true });

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult instanceof NextResponse) return authResult;

  const db = createDb(env.DATABASE_URL);
  const perms = await getUserPermissions(db, authResult.user.id);
  requireAnyPermission(perms, ["news.publish", "news.edit"]);

  const body = createSchema.parse(await request.json());
  const post = await createPost(db, { ...body, authorId: authResult.user.id });
  return NextResponse.json({ post }, { status: 201 });
}
