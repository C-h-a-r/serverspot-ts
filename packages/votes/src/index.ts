import type { Database } from "@serverspot/db";
import {
  voteCallbacks,
  voteClaims,
  votePendingClaims,
  voteRewards,
  voteSites,
  voteStreaks,
} from "@serverspot/db/schema";
import { generateToken } from "@serverspot/utils";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

export async function listVoteSites(db: Database, enabledOnly = false) {
  if (enabledOnly) {
    return db.select().from(voteSites).where(eq(voteSites.enabled, true)).orderBy(voteSites.name);
  }
  return db.select().from(voteSites).orderBy(voteSites.name);
}

export async function getVoteSiteBySlug(db: Database, slug: string) {
  const [site] = await db.select().from(voteSites).where(eq(voteSites.slug, slug)).limit(1);
  return site ?? null;
}

export async function recordVoteCallback(
  db: Database,
  input: {
    siteId: string;
    username: string;
    playerUuid?: string;
    ipAddress?: string;
    verified: boolean;
    rawPayload?: Record<string, unknown>;
  },
) {
  const [callback] = await db
    .insert(voteCallbacks)
    .values({
      siteId: input.siteId,
      username: input.username,
      playerUuid: input.playerUuid ?? null,
      ipAddress: input.ipAddress ?? null,
      verified: input.verified,
      rawPayload: input.rawPayload ?? {},
    })
    .returning();

  if (!input.verified) return { callback: callback!, pendingClaim: null };

  const claimToken = generateToken(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

  const [pendingClaim] = await db
    .insert(votePendingClaims)
    .values({
      siteId: input.siteId,
      callbackId: callback!.id,
      username: input.username,
      claimToken,
      expiresAt,
    })
    .returning();

  return { callback: callback!, pendingClaim: pendingClaim! };
}

export async function getPendingClaimByToken(db: Database, token: string) {
  const [claim] = await db
    .select()
    .from(votePendingClaims)
    .where(
      and(
        eq(votePendingClaims.claimToken, token),
        isNull(votePendingClaims.claimedAt),
        gt(votePendingClaims.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return claim ?? null;
}

export async function claimVoteReward(
  db: Database,
  input: { token: string; userId?: string | null },
) {
  const pending = await getPendingClaimByToken(db, input.token);
  if (!pending) throw new Error("Invalid or expired claim token");

  const [site] = await db.select().from(voteSites).where(eq(voteSites.id, pending.siteId)).limit(1);
  if (!site) throw new Error("Vote site not found");

  const [reward] = await db
    .select()
    .from(voteRewards)
    .where(and(eq(voteRewards.siteId, site.id), eq(voteRewards.active, true)))
    .limit(1);

  await db
    .update(votePendingClaims)
    .set({ claimedAt: new Date() })
    .where(eq(votePendingClaims.id, pending.id));

  const [claim] = await db
    .insert(voteClaims)
    .values({
      siteId: site.id,
      userId: input.userId ?? null,
      username: pending.username,
      rewardType: reward?.rewardType ?? "command",
      rewardPayload: reward?.payload ?? { commands: [`say Thanks for voting, ${pending.username}!`] },
    })
    .returning();

  await updateVoteStreak(db, pending.username, input.userId ?? null);

  return { claim: claim!, site, reward: reward ?? null };
}

async function updateVoteStreak(db: Database, username: string, userId: string | null) {
  const [existing] = await db
    .select()
    .from(voteStreaks)
    .where(eq(voteStreaks.username, username))
    .limit(1);

  const now = new Date();

  if (!existing) {
    await db.insert(voteStreaks).values({
      username,
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastVoteAt: now,
    });
    return;
  }

  const lastVote = existing.lastVoteAt ? new Date(existing.lastVoteAt) : null;
  const withinDay = lastVote && now.getTime() - lastVote.getTime() < 48 * 60 * 60_000;
  const currentStreak = withinDay ? existing.currentStreak + 1 : 1;

  await db
    .update(voteStreaks)
    .set({
      userId: userId ?? existing.userId,
      currentStreak,
      longestStreak: Math.max(existing.longestStreak, currentStreak),
      lastVoteAt: now,
      updatedAt: now,
    })
    .where(eq(voteStreaks.id, existing.id));
}

export async function getVoteStats(db: Database) {
  const [siteCount] = await db.select({ count: count() }).from(voteSites);
  const [claimCount] = await db.select({ count: count() }).from(voteClaims);
  return {
    sites: siteCount?.count ?? 0,
    claims: claimCount?.count ?? 0,
  };
}

export async function listRecentClaims(db: Database, limit = 20) {
  return db.select().from(voteClaims).orderBy(desc(voteClaims.createdAt)).limit(limit);
}

export const voteSiteInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  voteUrl: z.string().url(),
  callbackMethod: z.enum(["token", "hmac", "ip"]).default("token"),
  secret: z.string().optional(),
  cooldownMinutes: z.number().int().positive().default(1440),
});

export async function createVoteSite(db: Database, input: z.infer<typeof voteSiteInputSchema>) {
  const data = voteSiteInputSchema.parse(input);
  const slug =
    data.slug ??
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const [site] = await db
    .insert(voteSites)
    .values({ ...data, slug })
    .returning();

  await db.insert(voteRewards).values({
    siteId: site!.id,
    name: "Default reward",
    rewardType: "command",
    payload: { commands: ["say Thanks for voting, {player}!"] },
  });

  return site!;
}

export async function getTopVoters(db: Database, limit = 10) {
  return db
    .select()
    .from(voteStreaks)
    .orderBy(desc(voteStreaks.currentStreak))
    .limit(limit);
}
