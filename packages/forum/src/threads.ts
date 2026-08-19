import type { Database } from "@serverspot/db";
import { forumCategories, forumPosts, forumThreads, users } from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const threadInputSchema = z.object({
  categoryId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().min(3).max(200),
  body: z.string().min(1),
});

export async function listCategories(db: Database) {
  return db
    .select()
    .from(forumCategories)
    .where(isNull(forumCategories.deletedAt))
    .orderBy(forumCategories.sortOrder);
}

export async function listThreads(db: Database, categoryId?: string) {
  const conditions = [isNull(forumThreads.deletedAt)];
  if (categoryId) conditions.push(eq(forumThreads.categoryId, categoryId));

  return db
    .select({
      thread: forumThreads,
      authorName: users.name,
      categoryName: forumCategories.name,
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
    .where(and(...conditions))
    .orderBy(desc(forumThreads.pinned), desc(forumThreads.updatedAt));
}

export async function getThreadBySlug(db: Database, slug: string) {
  const [row] = await db
    .select({
      thread: forumThreads,
      authorName: users.name,
      categoryName: forumCategories.name,
      categorySlug: forumCategories.slug,
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .innerJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
    .where(and(eq(forumThreads.slug, slug), isNull(forumThreads.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getThreadPosts(db: Database, threadId: string) {
  return db
    .select({ post: forumPosts, authorName: users.name })
    .from(forumPosts)
    .innerJoin(users, eq(forumPosts.authorId, users.id))
    .where(and(eq(forumPosts.threadId, threadId), isNull(forumPosts.deletedAt)))
    .orderBy(forumPosts.createdAt);
}

export async function createThread(db: Database, input: z.infer<typeof threadInputSchema>) {
  const data = threadInputSchema.parse(input);
  const slug = slugify(data.title);

  const [thread] = await db
    .insert(forumThreads)
    .values({
      categoryId: data.categoryId,
      authorId: data.authorId,
      title: data.title,
      slug,
    })
    .returning();

  if (!thread) throw new Error("Failed to create thread");

  await db.insert(forumPosts).values({
    threadId: thread.id,
    authorId: data.authorId,
    body: data.body,
  });

  return thread;
}

export async function getForumStats(db: Database) {
  const [threadCount] = await db
    .select({ count: count() })
    .from(forumThreads)
    .where(isNull(forumThreads.deletedAt));
  const [postCount] = await db
    .select({ count: count() })
    .from(forumPosts)
    .where(isNull(forumPosts.deletedAt));
  return { threads: threadCount?.count ?? 0, posts: postCount?.count ?? 0 };
}
