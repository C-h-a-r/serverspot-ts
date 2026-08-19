import { seedDatabase } from "@serverspot/db";
import { createLogger } from "@serverspot/observability";
import { Command } from "commander";

const log = createLogger("cli:seed");

export const seedCommand = new Command("seed")
  .description("Seed default roles, permissions, and modules")
  .action(async () => {
    if (!process.env.DATABASE_URL) {
      log.error("DATABASE_URL is required");
      process.exit(1);
    }

    await seedDatabase(process.env.DATABASE_URL);
    log.info("Seed complete");
  });
