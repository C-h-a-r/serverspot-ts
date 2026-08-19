import { createLogger } from "@serverspot/observability";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import * as schema from "./schema/index";

const log = createLogger("db:seed-demo");

export async function seedDemoData(db: Database) {
  const owner = await db.query.users.findFirst();
  if (!owner) {
    log.warn("No users found — skipping demo data (run create-admin first)");
    return;
  }

  log.info("Seeding demo store product...");
  await db
    .insert(schema.storeProducts)
    .values({
      name: "VIP Rank",
      slug: "vip-rank",
      description: "Premium rank with exclusive perks",
      type: "rank",
      price: "9.99",
      visible: true,
      featured: true,
    })
    .onConflictDoNothing({ target: schema.storeProducts.slug });

  log.info("Seeding demo forum category...");
  const [category] = await db
    .insert(schema.forumCategories)
    .values({ name: "General", slug: "general", description: "General discussion" })
    .onConflictDoNothing({ target: schema.forumCategories.slug })
    .returning();

  const forumCat =
    category ??
    (await db.query.forumCategories.findFirst({ where: eq(schema.forumCategories.slug, "general") }));

  if (forumCat) {
    const existingThread = await db.query.forumThreads.findFirst({
      where: eq(schema.forumThreads.slug, "welcome-to-serverspot"),
    });
    if (!existingThread) {
      const [thread] = await db
        .insert(schema.forumThreads)
        .values({
          categoryId: forumCat.id,
          authorId: owner.id,
          title: "Welcome to ServerSpot",
          slug: "welcome-to-serverspot",
          pinned: true,
        })
        .returning();
      if (thread) {
        await db.insert(schema.forumPosts).values({
          threadId: thread.id,
          authorId: owner.id,
          body: "Welcome to your new game server community platform!",
        });
      }
    }
  }

  log.info("Seeding demo help article...");
  await db
    .insert(schema.supportHelpArticles)
    .values({
      title: "How to link your account",
      slug: "how-to-link-account",
      body: "Run /link in-game and enter the code on your profile page.",
      published: true,
    })
    .onConflictDoNothing({ target: schema.supportHelpArticles.slug });

  log.info("Seeding demo blog post...");
  await db
    .insert(schema.cmsPosts)
    .values({
      authorId: owner.id,
      title: "ServerSpot is live",
      slug: "serverspot-is-live",
      excerpt: "Your community platform is ready.",
      body: "Welcome to ServerSpot! Configure modules in the admin dashboard.",
      status: "published",
      publishedAt: new Date(),
    })
    .onConflictDoNothing({ target: schema.cmsPosts.slug });

  log.info("Seeding demo player profile...");
  await db
    .insert(schema.userProfiles)
    .values({
      userId: owner.id,
      displayName: owner.name,
      slug: owner.name.toLowerCase().replace(/\s+/g, "-"),
      bio: "Server owner",
      privacy: "public",
      joinDate: new Date(),
    })
    .onConflictDoNothing({ target: schema.userProfiles.userId });

  log.info("Demo data seeded");

  log.info("Seeding demo leaderboard...");
  await db
    .insert(schema.leaderboardBoards)
    .values({
      name: "Top Players",
      slug: "top-players",
      description: "Most active players",
      statKey: "playtime",
      displayLimit: 10,
    })
    .onConflictDoNothing({ target: schema.leaderboardBoards.slug });

  log.info("Seeding demo vote site...");
  await db
    .insert(schema.voteSites)
    .values({
      name: "Minecraft-MP",
      slug: "minecraft-mp",
      voteUrl: "https://minecraft-mp.com/server/example/vote",
      callbackMethod: "token",
      secret: "demo-vote-secret",
    })
    .onConflictDoNothing({ target: schema.voteSites.slug });

  log.info("Seeding demo staff application form...");
  const [appForm] = await db
    .insert(schema.applicationForms)
    .values({
      name: "Staff Application",
      slug: "staff",
      description: "Apply to join our moderation team.",
      status: "open",
    })
    .onConflictDoNothing({ target: schema.applicationForms.slug })
    .returning();

  const staffForm =
    appForm ??
    (await db.query.applicationForms.findFirst({
      where: eq(schema.applicationForms.slug, "staff"),
    }));

  if (staffForm) {
    const [existingQ] = await db
      .select()
      .from(schema.applicationQuestions)
      .where(eq(schema.applicationQuestions.formId, staffForm.id))
      .limit(1);
    if (!existingQ) {
      await db.insert(schema.applicationQuestions).values([
        {
          formId: staffForm.id,
          label: "Why do you want to be staff?",
          type: "textarea",
          required: true,
          sortOrder: 0,
        },
        {
          formId: staffForm.id,
          label: "Timezone",
          type: "text",
          required: true,
          sortOrder: 1,
        },
      ]);
    }
  }

  log.info("Seeding demo analytics events...");
  const sampleEvents = [
    { eventType: "page.view", module: "core", path: "/" },
    { eventType: "page.view", module: "store", path: "/store" },
    { eventType: "user.register", module: "users" },
    { eventType: "vote.claim", module: "votes" },
    { eventType: "order.completed", module: "store" },
  ];
  for (const evt of sampleEvents) {
    await db.insert(schema.analyticsEvents).values(evt);
  }

  log.info("Seeding demo Discord guild config...");
  await db
    .insert(schema.discordGuildConfig)
    .values({
      guildId: process.env.DISCORD_GUILD_ID ?? "000000000000000000",
      guildName: "Demo Guild",
    })
    .onConflictDoNothing({ target: schema.discordGuildConfig.guildId });
}
