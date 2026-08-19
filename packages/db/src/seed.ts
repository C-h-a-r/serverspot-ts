import { DEFAULT_MODULE_STATE, MODULES, type ModuleSlug } from "@serverspot/config";
import { createLogger } from "@serverspot/observability";
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import * as schema from "./schema/index";

const log = createLogger("db:seed");

const PERMISSIONS = [
  { slug: "forums.create", description: "Create forum posts", module: "forum" },
  { slug: "forums.moderate", description: "Moderate forum content", module: "forum" },
  { slug: "forums.delete", description: "Delete forum content", module: "forum" },
  { slug: "tickets.view", description: "View support tickets", module: "support" },
  { slug: "tickets.manage", description: "Manage support tickets", module: "support" },
  { slug: "tickets.assign", description: "Assign support tickets", module: "support" },
  { slug: "news.publish", description: "Publish blog posts", module: "blog" },
  { slug: "news.edit", description: "Edit blog posts", module: "blog" },
  { slug: "news.delete", description: "Delete blog posts", module: "blog" },
  { slug: "store.manage", description: "Manage store products", module: "store" },
  { slug: "store.orders", description: "View and manage orders", module: "store" },
  { slug: "store.refund", description: "Process refunds", module: "store" },
  { slug: "settings.manage", description: "Manage site settings", module: "settings" },
  { slug: "theme.edit", description: "Edit theme files", module: "settings" },
  { slug: "users.manage", description: "Manage users", module: "users" },
  { slug: "analytics.view", description: "View analytics", module: "analytics" },
  { slug: "applications.review", description: "Review applications", module: "applications" },
  { slug: "votes.manage", description: "Manage vote rewards", module: "votes" },
  { slug: "developer.api", description: "Access developer API", module: "developer" },
  { slug: "developer.webhooks", description: "Manage webhooks", module: "developer" },
  { slug: "admin.access", description: "Access admin dashboard", module: "admin" },
] as const;

const ROLES = [
  { name: "Owner", slug: "owner", level: 100, colour: "#88d0f8", isSystem: true },
  { name: "Admin", slug: "admin", level: 80, colour: "#7ec8e3", isSystem: true },
  { name: "Moderator", slug: "moderator", level: 60, colour: "#a78bfa", isSystem: true },
  { name: "Support", slug: "support", level: 40, colour: "#fb923c", isSystem: true },
  { name: "User", slug: "user", level: 10, colour: "#94a3b8", isSystem: true },
] as const;

export async function seedDatabase(connectionString: string) {
  const db = createDb(connectionString);

  log.info("Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await db
      .insert(schema.permissions)
      .values(perm)
      .onConflictDoNothing({ target: schema.permissions.slug });
  }

  log.info("Seeding roles...");
  for (const role of ROLES) {
    await db.insert(schema.roles).values(role).onConflictDoNothing({ target: schema.roles.slug });
  }

  const allPermissions = await db.select().from(schema.permissions);
  const ownerRole = await db.query.roles.findFirst({
    where: eq(schema.roles.slug, "owner"),
  });

  if (ownerRole) {
    for (const perm of allPermissions) {
      await db
        .insert(schema.rolePermissions)
        .values({ roleId: ownerRole.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  log.info("Seeding modules...");
  for (const slug of MODULES) {
    await db
      .insert(schema.modules)
      .values({ slug, enabled: DEFAULT_MODULE_STATE[slug as ModuleSlug] })
      .onConflictDoNothing({ target: schema.modules.slug });
  }

  log.info("Seeding global settings...");
  await db
    .insert(schema.globalSettings)
    .values({
      key: "site",
      value: {
        name: "ServerSpot",
        tagline: "Everything you need to run your game server website",
        maintenanceMode: false,
        timezone: "UTC",
        locale: "en",
      },
    })
    .onConflictDoNothing({ target: schema.globalSettings.key });

  await db
    .insert(schema.themePacks)
    .values({ name: "Default", slug: "default", isActive: true })
    .onConflictDoNothing({ target: schema.themePacks.slug });

  const { seedDemoData } = await import("./seed-demo");
  await seedDemoData(db);

  log.info("Seed complete");
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  seedDatabase(url)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
