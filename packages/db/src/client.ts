import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type Database = ReturnType<typeof createDb>;

let dbInstance: Database | null = null;

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

export function getDb(connectionString: string): Database {
  if (!dbInstance) {
    dbInstance = createDb(connectionString);
  }
  return dbInstance;
}

export { schema };
