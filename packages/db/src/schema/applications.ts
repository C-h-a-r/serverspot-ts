import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const applicationForms = pgTable(
  "application_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("open"),
    deadline: timestamp("deadline", { withTimezone: true }),
    maxSubmissions: integer("max_submissions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("application_forms_slug_idx").on(table.slug)],
);

export const applicationQuestions = pgTable(
  "application_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => applicationForms.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: text("type").notNull().default("text"),
    required: boolean("required").notNull().default(true),
    options: jsonb("options").default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("application_questions_form_id_idx").on(table.formId)],
);

export const applicationSubmissions = pgTable(
  "application_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => applicationForms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    status: text("status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("application_submissions_form_id_idx").on(table.formId),
    index("application_submissions_status_idx").on(table.status),
  ],
);

export const applicationAnswers = pgTable(
  "application_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => applicationSubmissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => applicationQuestions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("application_answers_submission_id_idx").on(table.submissionId)],
);

export const applicationReviews = pgTable(
  "application_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => applicationSubmissions.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("application_reviews_submission_id_idx").on(table.submissionId)],
);

export const applicationVotes = pgTable(
  "application_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => applicationSubmissions.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: text("vote").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("application_votes_submission_reviewer_idx").on(
      table.submissionId,
      table.reviewerId,
    ),
  ],
);

export const applicationFormsRelations = relations(applicationForms, ({ many }) => ({
  questions: many(applicationQuestions),
  submissions: many(applicationSubmissions),
}));

export const applicationSubmissionsRelations = relations(applicationSubmissions, ({ one, many }) => ({
  form: one(applicationForms, {
    fields: [applicationSubmissions.formId],
    references: [applicationForms.id],
  }),
  answers: many(applicationAnswers),
  reviews: many(applicationReviews),
  votes: many(applicationVotes),
}));
