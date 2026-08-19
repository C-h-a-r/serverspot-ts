import type { ModuleSlug } from "@serverspot/config";
import { createDb } from "@serverspot/db";
import { modules } from "@serverspot/db/schema";
import { env } from "@serverspot/config/env";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export async function isModuleEnabled(slug: ModuleSlug): Promise<boolean> {
  const db = createDb(env.DATABASE_URL);
  const row = await db.query.modules.findFirst({
    where: eq(modules.slug, slug),
  });
  return row?.enabled ?? false;
}

export async function requireModule(slug: ModuleSlug): Promise<void> {
  const enabled = await isModuleEnabled(slug);
  if (!enabled) {
    notFound();
  }
}
