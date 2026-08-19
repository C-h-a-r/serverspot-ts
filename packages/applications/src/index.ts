import type { Database } from "@serverspot/db";
import {
  applicationAnswers,
  applicationForms,
  applicationQuestions,
  applicationReviews,
  applicationSubmissions,
  applicationVotes,
} from "@serverspot/db/schema";
import { slugify } from "@serverspot/utils";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const questionInputSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "select", "url"]).default("text"),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(),
  sortOrder: z.number().int().default(0),
});

export const formInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["open", "closed"]).default("open"),
  questions: z.array(questionInputSchema).min(1),
});

export const submissionInputSchema = z.object({
  formId: z.string().uuid(),
  userId: z.string().uuid().optional().nullable(),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  answers: z.array(z.object({ questionId: z.string().uuid(), value: z.string() })),
});

export async function listForms(db: Database, openOnly = false) {
  const conditions = [isNull(applicationForms.deletedAt)];
  if (openOnly) conditions.push(eq(applicationForms.status, "open"));

  return db
    .select()
    .from(applicationForms)
    .where(and(...conditions))
    .orderBy(desc(applicationForms.createdAt));
}

export async function getFormBySlug(db: Database, slug: string) {
  const [form] = await db
    .select()
    .from(applicationForms)
    .where(and(eq(applicationForms.slug, slug), isNull(applicationForms.deletedAt)))
    .limit(1);
  if (!form) return null;

  const questions = await db
    .select()
    .from(applicationQuestions)
    .where(eq(applicationQuestions.formId, form.id))
    .orderBy(applicationQuestions.sortOrder);

  return { form, questions };
}

export async function createForm(db: Database, input: z.infer<typeof formInputSchema>) {
  const data = formInputSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.name);

  const [form] = await db
    .insert(applicationForms)
    .values({
      name: data.name,
      slug,
      description: data.description,
      status: data.status,
    })
    .returning();

  await db.insert(applicationQuestions).values(
    data.questions.map((q, i) => ({
      formId: form!.id,
      label: q.label,
      type: q.type,
      required: q.required,
      options: q.options ?? [],
      sortOrder: q.sortOrder ?? i,
    })),
  );

  return form!;
}

export async function submitApplication(
  db: Database,
  input: z.infer<typeof submissionInputSchema>,
) {
  const data = submissionInputSchema.parse(input);

  const [form] = await db
    .select()
    .from(applicationForms)
    .where(eq(applicationForms.id, data.formId))
    .limit(1);

  if (!form || form.status !== "open") throw new Error("Form is not accepting submissions");

  const [submission] = await db
    .insert(applicationSubmissions)
    .values({
      formId: data.formId,
      userId: data.userId ?? null,
      applicantName: data.applicantName,
      applicantEmail: data.applicantEmail,
      status: "submitted",
    })
    .returning();

  if (data.answers.length > 0) {
    await db.insert(applicationAnswers).values(
      data.answers.map((a) => ({
        submissionId: submission!.id,
        questionId: a.questionId,
        value: a.value,
      })),
    );
  }

  return submission!;
}

export async function listSubmissions(db: Database, formId?: string, limit = 50) {
  const conditions = formId ? [eq(applicationSubmissions.formId, formId)] : [];

  return db
    .select()
    .from(applicationSubmissions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(applicationSubmissions.createdAt))
    .limit(limit);
}

export async function getSubmissionWithAnswers(db: Database, submissionId: string) {
  const [submission] = await db
    .select()
    .from(applicationSubmissions)
    .where(eq(applicationSubmissions.id, submissionId))
    .limit(1);
  if (!submission) return null;

  const answers = await db
    .select({
      answer: applicationAnswers,
      question: applicationQuestions,
    })
    .from(applicationAnswers)
    .innerJoin(applicationQuestions, eq(applicationAnswers.questionId, applicationQuestions.id))
    .where(eq(applicationAnswers.submissionId, submissionId));

  const reviews = await db
    .select()
    .from(applicationReviews)
    .where(eq(applicationReviews.submissionId, submissionId));

  const votes = await db
    .select()
    .from(applicationVotes)
    .where(eq(applicationVotes.submissionId, submissionId));

  return { submission, answers, reviews, votes };
}

export async function updateSubmissionStatus(
  db: Database,
  submissionId: string,
  status: "reviewing" | "accepted" | "denied" | "withdrawn",
) {
  const [updated] = await db
    .update(applicationSubmissions)
    .set({ status, updatedAt: new Date() })
    .where(eq(applicationSubmissions.id, submissionId))
    .returning();
  return updated ?? null;
}

export async function castReviewVote(
  db: Database,
  input: { submissionId: string; reviewerId: string; vote: "approve" | "deny" | "abstain" },
) {
  const [record] = await db
    .insert(applicationVotes)
    .values(input)
    .onConflictDoUpdate({
      target: [applicationVotes.submissionId, applicationVotes.reviewerId],
      set: { vote: input.vote },
    })
    .returning();
  return record!;
}

export async function addReviewNote(
  db: Database,
  input: { submissionId: string; reviewerId: string; note: string },
) {
  const [review] = await db.insert(applicationReviews).values(input).returning();
  return review!;
}

export async function getApplicationStats(db: Database) {
  const [formCount] = await db
    .select({ count: count() })
    .from(applicationForms)
    .where(isNull(applicationForms.deletedAt));
  const [submissionCount] = await db.select({ count: count() }).from(applicationSubmissions);
  return {
    forms: formCount?.count ?? 0,
    submissions: submissionCount?.count ?? 0,
  };
}
