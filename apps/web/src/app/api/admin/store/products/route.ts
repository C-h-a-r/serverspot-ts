import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createDb } from "@serverspot/db";
import { env } from "@serverspot/config/env";
import { getUserPermissions, requirePermission } from "@serverspot/permissions";
import { createProduct, productInputSchema } from "@serverspot/store";

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult instanceof NextResponse) return authResult;

  const db = createDb(env.DATABASE_URL);
  const perms = await getUserPermissions(db, authResult.user.id);
  requirePermission(perms, "store.manage");

  const body = productInputSchema.parse(await request.json());
  const product = await createProduct(db, body);
  return NextResponse.json({ product }, { status: 201 });
}
