import type { Database } from "@serverspot/db";
import { cmsCategories, cmsPages, cmsPosts, users } from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const postInputSchema = z.object({
  authorId: z.string().uuid(),
  title: z.string().min(3).max(200),
  excerpt: z.string().optional(),
  body: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  coverImage: z.string().optional(),
});

export async function listPosts(db: Database, publishedOnly = false) {
  const conditions = [isNull(cmsPosts.deletedAt)];
  if (publishedOnly) {
    conditions.push(eq(cmsPosts.status, "published"));
  }

  return db
    .select({
      post: cmsPosts,
      authorName: users.name,
      categoryName: cmsCategories.name,
    })
    .from(cmsPosts)
    .innerJoin(users, eq(cmsPosts.authorId, users.id))
    .leftJoin(cmsCategories, eq(cmsPosts.categoryId, cmsCategories.id))
    .where(and(...conditions))
    .orderBy(desc(cmsPosts.publishedAt), desc(cmsPosts.createdAt));
}

export async function getPostBySlug(db: Database, slug: string) {
  const [row] = await db
    .select({
      post: cmsPosts,
      authorName: users.name,
      categoryName: cmsCategories.name,
    })
    .from(cmsPosts)
    .innerJoin(users, eq(cmsPosts.authorId, users.id))
    .leftJoin(cmsCategories, eq(cmsPosts.categoryId, cmsCategories.id))
    .where(and(eq(cmsPosts.slug, slug), isNull(cmsPosts.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createPost(db: Database, input: z.infer<typeof postInputSchema>) {
  const data = postInputSchema.parse(input);
  const slug = slugify(data.title);
  const publishedAt = data.status === "published" ? new Date() : null;

  const [post] = await db
    .insert(cmsPosts)
    .values({ ...data, slug, publishedAt })
    .returning();
  return post;
}

export async function listPages(db: Database, publishedOnly = false) {
  const conditions = [isNull(cmsPages.deletedAt)];
  if (publishedOnly) conditions.push(eq(cmsPages.published, true));

  return db
    .select()
    .from(cmsPages)
    .where(and(...conditions))
    .orderBy(cmsPages.title);
}

export async function getPageBySlug(db: Database, slug: string) {
  const [page] = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), isNull(cmsPages.deletedAt)))
    .limit(1);
  return page ?? null;
}

export async function getCmsStats(db: Database) {
  const [postCount] = await db
    .select({ count: count() })
    .from(cmsPosts)
    .where(isNull(cmsPosts.deletedAt));
  return { posts: postCount?.count ?? 0 };
}
