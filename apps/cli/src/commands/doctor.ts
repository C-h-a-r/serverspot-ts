import { createLogger } from "@serverspot/observability";
import { Command } from "commander";
import { createDb } from "@serverspot/db";
import { sql } from "drizzle-orm";

const log = createLogger("cli:doctor");

export const doctorCommand = new Command("doctor")
  .description("Check system health and configuration")
  .action(async () => {
    let ok = true;

    if (!process.env.DATABASE_URL) {
      log.error("DATABASE_URL is not set");
      ok = false;
    } else {
      try {
        const db = createDb(process.env.DATABASE_URL);
        await db.execute(sql`SELECT 1`);
        log.info("Database connection: OK");
      } catch (err) {
        log.error({ err }, "Database connection: FAILED");
        ok = false;
      }
    }

    if (!process.env.AUTH_SECRET) {
      log.error("AUTH_SECRET is not set");
      ok = false;
    } else if (process.env.AUTH_SECRET.length < 32) {
      log.warn("AUTH_SECRET should be at least 32 characters");
    } else {
      log.info("AUTH_SECRET: OK");
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      log.warn("NEXT_PUBLIC_APP_URL is not set");
    } else {
      log.info("NEXT_PUBLIC_APP_URL: OK");
    }

    process.exit(ok ? 0 : 1);
  });
