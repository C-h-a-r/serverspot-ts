import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { getTicket, getTicketMessages } from "@serverspot/support";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@serverspot/ui";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createDb(env.DATABASE_URL);
  const ticket = await getTicket(db, id);
  if (!ticket) notFound();

  const messages = await getTicketMessages(db, id, true);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ticket.ticket.subject}</h1>
        <p className="text-muted-foreground">
          {ticket.userName} · {ticket.ticket.status} · {ticket.ticket.priority}
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {messages.map(({ message, authorName }) => (
            <div key={message.id} className="rounded border border-border p-3">
              <p className="text-xs text-muted-foreground">
                {authorName}
                {message.isInternal ? " (internal)" : ""} ·{" "}
                {new Date(message.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
