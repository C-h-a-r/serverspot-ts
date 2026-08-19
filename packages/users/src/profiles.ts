import type { Database } from "@serverspot/db";
import { userLinkedAccounts, userProfiles, users } from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

export const profileInputSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(2).max(50),
  bio: z.string().max(500).optional(),
  privacy: z.enum(["public", "members", "private"]).default("public"),
});

export async function listProfiles(db: Database, publicOnly = false) {
  const conditions = publicOnly
    ? [eq(userProfiles.privacy, "public")]
    : [];

  return db
    .select({
      profile: userProfiles,
      email: users.email,
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(userProfiles.updatedAt));
}

export async function getProfileBySlug(db: Database, slug: string) {
  const [row] = await db
    .select({ profile: userProfiles, email: users.email, userName: users.name })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getProfileByUserId(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function createOrUpdateProfile(db: Database, input: z.infer<typeof profileInputSchema>) {
  const data = profileInputSchema.parse(input);
  const slug = slugify(data.displayName);
  const existing = await getProfileByUserId(db, data.userId);

  if (existing) {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, slug, updatedAt: new Date() })
      .where(eq(userProfiles.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userProfiles)
    .values({ ...data, slug, joinDate: new Date() })
    .returning();
  return created;
}

export async function getLinkedAccounts(db: Database, userId: string) {
  return db
    .select()
    .from(userLinkedAccounts)
    .where(eq(userLinkedAccounts.userId, userId));
}

export async function getPlayerStats(db: Database) {
  const [profileCount] = await db.select({ count: count() }).from(userProfiles);
  return { profiles: profileCount?.count ?? 0 };
}

export async function ensureProfileForUser(db: Database, userId: string, name: string) {
  const existing = await getProfileByUserId(db, userId);
  if (existing) return existing;
  return createOrUpdateProfile(db, { userId, displayName: name, privacy: "public" });
}
