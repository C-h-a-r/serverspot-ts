import { createDb } from "@serverspot/db";
import { roles, userRoles, users } from "@serverspot/db/schema";
import { createLogger } from "@serverspot/observability";
import { Command } from "commander";
import { eq } from "drizzle-orm";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const log = createLogger("cli:create-admin");

async function createAdminUser(input: { name: string; email: string; password: string }) {
  if (!process.env.DATABASE_URL) {
    log.error("DATABASE_URL is required");
    process.exit(1);
  }

  if (!input.name || !input.email || input.password.length < 8) {
    log.error("Invalid input — name, email, and password (8+ chars) required");
    process.exit(1);
  }

  const db = createDb(process.env.DATABASE_URL);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existing) {
    log.error("User with this email already exists");
    process.exit(1);
  }

  const ownerRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "owner"),
  });

  if (!ownerRole) {
    log.error("Owner role not found — run 'pnpm cli seed' first");
    process.exit(1);
  }

  const { hash } = await import("argon2");
  const passwordHash = await hash(input.password);

  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, emailVerified: true })
    .returning();

  if (!user) {
    log.error("Failed to create user");
    process.exit(1);
  }

  const { accounts } = await import("@serverspot/db/schema");
  await db.insert(accounts).values({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: passwordHash,
  });

  await db.insert(userRoles).values({ userId: user.id, roleId: ownerRole.id });

  log.info({ email: input.email }, "Admin user created with owner role");
  log.info("You can now sign in at /login");
}

export const createAdminCommand = new Command("create-admin")
  .description("Create an admin user with owner role")
  .option("--name <name>", "Admin display name")
  .option("--email <email>", "Admin email address")
  .option("--password <password>", "Admin password (min 8 characters)")
  .action(async (options: { name?: string; email?: string; password?: string }) => {
    if (options.name && options.email && options.password) {
      await createAdminUser({
        name: options.name,
        email: options.email,
        password: options.password,
      });
      return;
    }

    if (options.name || options.email || options.password) {
      log.error("Provide all flags together: --name, --email, and --password");
      process.exit(1);
    }

    const rl = readline.createInterface({ input, output });
    const name = await rl.question("Name: ");
    const email = await rl.question("Email: ");
    const password = await rl.question("Password (min 8 chars): ");
    rl.close();

    await createAdminUser({ name, email, password });
  });
