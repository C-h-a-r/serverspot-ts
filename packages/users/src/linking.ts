import type { Database } from "@serverspot/db";
import { userLinkedAccounts } from "@serverspot/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const linkAccountSchema = z.object({
  userId: z.string().uuid(),
  platform: z.string().default("minecraft"),
  username: z.string().min(1),
  uuid: z.string().optional(),
});

export async function linkGameAccount(
  db: Database,
  input: z.infer<typeof linkAccountSchema>,
) {
  const data = linkAccountSchema.parse(input);

  const existing = await db
    .select()
    .from(userLinkedAccounts)
    .where(
      and(
        eq(userLinkedAccounts.platform, data.platform),
        eq(userLinkedAccounts.username, data.username),
      ),
    )
    .limit(1);

  if (existing[0] && existing[0].userId !== data.userId) {
    throw new Error("This game account is already linked to another user");
  }

  const userAccounts = await db
    .select()
    .from(userLinkedAccounts)
    .where(eq(userLinkedAccounts.userId, data.userId));

  const [account] = await db
    .insert(userLinkedAccounts)
    .values({
      userId: data.userId,
      platform: data.platform,
      username: data.username,
      uuid: data.uuid ?? null,
      verified: true,
      isPrimary: userAccounts.length === 0,
    })
    .onConflictDoNothing()
    .returning();

  if (account) return account;

  const [updated] = await db
    .update(userLinkedAccounts)
    .set({ verified: true, uuid: data.uuid ?? null })
    .where(
      and(
        eq(userLinkedAccounts.userId, data.userId),
        eq(userLinkedAccounts.platform, data.platform),
        eq(userLinkedAccounts.username, data.username),
      ),
    )
    .returning();

  return updated!;
}

export async function unlinkGameAccount(
  db: Database,
  userId: string,
  accountId: string,
) {
  await db
    .delete(userLinkedAccounts)
    .where(and(eq(userLinkedAccounts.id, accountId), eq(userLinkedAccounts.userId, userId)));
}
