import { env } from "@serverspot/config/env";
import { trackEvent } from "@serverspot/analytics";
import type { Database } from "@serverspot/db";
import { accounts } from "@serverspot/db/schema";
import { syncRoleForTrigger, type DiscordConfig } from "@serverspot/discord";
import { emitWebhookEvent } from "@serverspot/developer";
import { and, eq } from "drizzle-orm";

export function getDiscordConfig(): DiscordConfig {
  return {
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
  };
}

async function getDiscordUserId(db: Database, userId?: string | null) {
  if (!userId) return null;
  const [account] = await db
    .select({ accountId: accounts.accountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "discord")))
    .limit(1);
  return account?.accountId ?? null;
}

async function syncDiscordRole(
  db: Database,
  trigger: "order.completed" | "vote.claimed" | "application.accepted",
  userId?: string | null,
) {
  const discordUserId = await getDiscordUserId(db, userId);
  if (!discordUserId) return;
  await syncRoleForTrigger(db, getDiscordConfig(), { trigger, discordUserId });
}

export async function onOrderCompleted(
  db: Database,
  order: { id: string; userId?: string | null; total: string },
) {
  await emitWebhookEvent(db, "order.completed", {
    orderId: order.id,
    userId: order.userId,
    total: order.total,
  });
  await trackEvent(db, {
    eventType: "order.completed",
    module: "store",
    userId: order.userId,
  });
  await syncDiscordRole(db, "order.completed", order.userId);
}

export async function onVoteClaimed(
  db: Database,
  claim: { id: string; userId?: string | null; username: string },
) {
  await emitWebhookEvent(db, "vote.claimed", {
    claimId: claim.id,
    userId: claim.userId,
    username: claim.username,
  });
  await trackEvent(db, {
    eventType: "vote.claim",
    module: "votes",
    userId: claim.userId,
  });
  await syncDiscordRole(db, "vote.claimed", claim.userId);
}

export async function onApplicationSubmitted(
  db: Database,
  submission: { id: string; formId: string; userId?: string | null; applicantName: string },
) {
  await emitWebhookEvent(db, "application.submitted", {
    submissionId: submission.id,
    formId: submission.formId,
    userId: submission.userId,
    applicantName: submission.applicantName,
  });
  await trackEvent(db, {
    eventType: "application.submit",
    module: "applications",
    userId: submission.userId,
  });
}

export async function onApplicationAccepted(
  db: Database,
  submission: { id: string; userId?: string | null; applicantName: string },
) {
  await emitWebhookEvent(db, "application.accepted", {
    submissionId: submission.id,
    userId: submission.userId,
    applicantName: submission.applicantName,
  });
  await trackEvent(db, {
    eventType: "application.accepted",
    module: "applications",
    userId: submission.userId,
  });
  await syncDiscordRole(db, "application.accepted", submission.userId);
}
