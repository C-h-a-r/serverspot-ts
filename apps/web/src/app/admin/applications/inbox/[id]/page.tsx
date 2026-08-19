import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getSubmissionWithAnswers, updateSubmissionStatus } from "@serverspot/applications";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/module-pages";
import { onApplicationAccepted } from "@/lib/integrations";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createDb(env.DATABASE_URL);
  const data = await getSubmissionWithAnswers(db, id);
  if (!data) notFound();

  async function setStatus(formData: FormData) {
    "use server";
    const status = formData.get("status") as "accepted" | "denied" | "reviewing";
    const db = createDb(env.DATABASE_URL);
    const updated = await updateSubmissionStatus(db, id, status);
    if (status === "accepted" && updated) {
      await onApplicationAccepted(db, {
        id: updated.id,
        userId: updated.userId,
        applicantName: updated.applicantName,
      });
    }
    redirect(`/admin/applications/inbox/${id}`);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/applications/inbox" className="text-sm text-accent">
        ← Back to inbox
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.submission.applicantName}</h1>
          <p className="text-muted-foreground">{data.submission.applicantEmail}</p>
        </div>
        <StatusBadge status={data.submission.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.answers.map(({ answer, question }) => (
            <div key={answer.id}>
              <p className="text-sm font-medium">{question.label}</p>
              <p className="text-sm text-muted-foreground">{answer.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <form action={setStatus} className="flex gap-2">
        <button
          type="submit"
          name="status"
          value="reviewing"
          className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-border px-3 text-sm"
        >
          Mark reviewing
        </button>
        <button
          type="submit"
          name="status"
          value="accepted"
          className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-primary px-3 text-sm text-primary-foreground"
        >
          Accept
        </button>
        <button
          type="submit"
          name="status"
          value="denied"
          className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-destructive px-3 text-sm text-destructive"
        >
          Deny
        </button>
      </form>

      {data.votes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff votes</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {data.votes.map((v) => (
              <Badge key={v.id} variant="secondary">
                {v.vote}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
