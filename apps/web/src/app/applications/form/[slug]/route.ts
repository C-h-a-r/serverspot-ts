import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getFormBySlug, submitApplication } from "@serverspot/applications";
import { notFound, redirect } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";
import { getSession } from "@/lib/auth";
import { onApplicationSubmitted } from "@/lib/integrations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("applications");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const data = await getFormBySlug(db, slug);
  if (!data || data.form.status !== "open") notFound();

  return renderPublicSpotPage({
    template: "applications/form.html",
    extraContext: {
      form: {
        name: data.form.name,
        slug: data.form.slug,
        description: data.form.description ?? "",
        id: data.form.id,
      },
      questions: data.questions.map((q) => ({
        id: q.id,
        label: q.label,
        type: q.type,
        required: q.required,
        options: (q.options as string[]) ?? [],
      })),
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("applications");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const data = await getFormBySlug(db, slug);
  if (!data) notFound();

  const body = (await request.json()) as {
    applicantName?: string;
    applicantEmail?: string;
    answers?: { questionId: string; value: string }[];
  };

  const session = await getSession();

  try {
    const submission = await submitApplication(db, {
      formId: data.form.id,
      userId: session?.user.id,
      applicantName: body.applicantName ?? session?.user.name ?? "Anonymous",
      applicantEmail: body.applicantEmail ?? session?.user.email ?? "",
      answers: body.answers ?? [],
    });
    await onApplicationSubmitted(db, {
      id: submission.id,
      formId: submission.formId,
      userId: submission.userId,
      applicantName: submission.applicantName,
    });
  } catch {
    redirect(`/applications/form/${slug}?error=1`);
  }

  redirect(`/applications?submitted=1`);
}
