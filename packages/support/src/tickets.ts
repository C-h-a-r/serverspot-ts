import type { Database } from "@serverspot/db";
import {
  supportHelpArticles,
  supportHelpCategories,
  supportTicketMessages,
  supportTickets,
  users,
} from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const ticketInputSchema = z.object({
  userId: z.string().uuid(),
  subject: z.string().min(3).max(200),
  body: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  categoryId: z.string().uuid().optional().nullable(),
});

export async function listTickets(db: Database, status?: string) {
  const conditions = [isNull(supportTickets.deletedAt)];
  if (status) conditions.push(eq(supportTickets.status, status));

  return db
    .select({
      ticket: supportTickets,
      userName: users.name,
    })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(supportTickets.updatedAt));
}

export async function getTicket(db: Database, ticketId: string) {
  const [row] = await db
    .select({ ticket: supportTickets, userName: users.name })
    .from(supportTickets)
    .innerJoin(users, eq(supportTickets.userId, users.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  return row ?? null;
}

export async function getTicketMessages(db: Database, ticketId: string, includeInternal = false) {
  const rows = await db
    .select({ message: supportTicketMessages, authorName: users.name })
    .from(supportTicketMessages)
    .innerJoin(users, eq(supportTicketMessages.authorId, users.id))
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(supportTicketMessages.createdAt);

  return includeInternal ? rows : rows.filter((r) => !r.message.isInternal);
}

export async function createTicket(db: Database, input: z.infer<typeof ticketInputSchema>) {
  const data = ticketInputSchema.parse(input);
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: data.userId,
      subject: data.subject,
      priority: data.priority,
      categoryId: data.categoryId,
    })
    .returning();

  if (!ticket) throw new Error("Failed to create ticket");

  await db.insert(supportTicketMessages).values({
    ticketId: ticket.id,
    authorId: data.userId,
    body: data.body,
  });

  return ticket;
}

export async function listHelpArticles(db: Database, publishedOnly = true) {
  const conditions = [isNull(supportHelpArticles.deletedAt)];
  if (publishedOnly) conditions.push(eq(supportHelpArticles.published, true));

  return db
    .select({
      article: supportHelpArticles,
      categoryName: supportHelpCategories.name,
    })
    .from(supportHelpArticles)
    .leftJoin(supportHelpCategories, eq(supportHelpArticles.categoryId, supportHelpCategories.id))
    .where(and(...conditions))
    .orderBy(supportHelpArticles.title);
}

export async function getHelpArticleBySlug(db: Database, slug: string) {
  const [row] = await db
    .select({ article: supportHelpArticles, categoryName: supportHelpCategories.name })
    .from(supportHelpArticles)
    .leftJoin(supportHelpCategories, eq(supportHelpArticles.categoryId, supportHelpCategories.id))
    .where(and(eq(supportHelpArticles.slug, slug), isNull(supportHelpArticles.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createHelpArticle(
  db: Database,
  input: { title: string; body: string; published?: boolean; categoryId?: string },
) {
  const slug = slugify(input.title);
  const [article] = await db
    .insert(supportHelpArticles)
    .values({ ...input, slug })
    .returning();
  return article;
}

export async function getSupportStats(db: Database) {
  const [open] = await db
    .select({ count: count() })
    .from(supportTickets)
    .where(and(eq(supportTickets.status, "open"), isNull(supportTickets.deletedAt)));
  return { openTickets: open?.count ?? 0 };
}
