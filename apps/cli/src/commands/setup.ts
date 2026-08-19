import { createLogger } from "@serverspot/observability";
import { Command } from "commander";
import { execSync } from "node:child_process";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const log = createLogger("cli:setup");

function generateSecret(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const setupCommand = new Command("setup")
  .description("Interactive first-run setup")
  .action(async () => {
    const rl = readline.createInterface({ input, output });
    const rootDir = resolve(process.cwd(), "../..");
    const envPath = resolve(rootDir, ".env");

    if (existsSync(envPath)) {
      log.warn(".env already exists — skipping file creation");
    } else {
      const appUrl = (await rl.question("App URL [http://localhost:3000]: ")) || "http://localhost:3000";
      const dbPassword = (await rl.question("PostgreSQL password [serverspot]: ")) || "serverspot";
      const authSecret = generateSecret(48);

      const envContent = `# ServerSpot Environment
NODE_ENV=development
DATABASE_URL=postgresql://serverspot:${dbPassword}@localhost:5432/serverspot
AUTH_SECRET=${authSecret}
AUTH_URL=${appUrl}
NEXT_PUBLIC_APP_URL=${appUrl}
UPLOAD_DIR=./uploads
LOG_LEVEL=debug
`;

      writeFileSync(envPath, envContent);
      log.info({ path: envPath }, "Created .env file");
    }

    rl.close();

    log.info("Starting PostgreSQL via docker-compose...");
    try {
      execSync("docker compose up -d postgres", { cwd: rootDir, stdio: "inherit" });
    } catch {
      log.warn("Could not start postgres — ensure Docker is running");
    }

    log.info("Setup complete. Next steps:");
    log.info("  1. pnpm install");
    log.info("  2. pnpm cli migrate");
    log.info("  3. pnpm cli seed");
    log.info("  4. pnpm cli create-admin");
    log.info("  5. pnpm dev");
  });
