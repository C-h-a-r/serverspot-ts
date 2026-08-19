#!/usr/bin/env node
import { Command } from "commander";
import { createAdminCommand } from "./commands/create-admin.js";
import { doctorCommand } from "./commands/doctor.js";
import { migrateCommand } from "./commands/migrate.js";
import { seedCommand } from "./commands/seed.js";
import { setupCommand } from "./commands/setup.js";

const program = new Command();

program
  .name("serverspot")
  .description("ServerSpot CLI — setup, migrate, and manage your instance")
  .version("0.0.1");

program.addCommand(setupCommand);
program.addCommand(doctorCommand);
program.addCommand(migrateCommand);
program.addCommand(seedCommand);
program.addCommand(createAdminCommand);

program.parse();
