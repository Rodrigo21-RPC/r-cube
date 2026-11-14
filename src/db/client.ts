import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/** Conexión nueva por petición a través de Hyperdrive (research R2). */
export function createDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  const sql = postgres(connectionString, { max: 5, fetch_types: false, prepare: true });
  return { db: drizzle(sql, { schema }), close: () => sql.end() };
}

export { schema };
