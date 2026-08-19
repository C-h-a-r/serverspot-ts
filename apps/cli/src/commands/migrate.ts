import { createLogger } from "@serverspot/observability";
import { Command } from "commander";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const log = createLogger("cli:migrate");

export const migrateCommand = new Command("migrate")
  .description("Run database migrations")
  .action(async () => {
    if (!process.env.DATABASE_URL) {
      log.error("DATABASE_URL is required");
      process.exit(1);
    }

    const dbPackage = resolve(process.cwd(), "../../packages/db");
    log.info("Running drizzle-kit migrate...");
    execSync("pnpm drizzle-kit migrate", {
      cwd: dbPackage,
      stdio: "inherit",
      env: process.env,
    });
    log.info("Migrations complete");
  });
