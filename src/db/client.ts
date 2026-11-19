import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const remoteUrl = process.env.TURSO_DATABASE_URL;
const localUrl = process.env.LOCAL_DATABASE_URL ?? "file:./local.db";

/**
 * Local development runs against a plain libSQL file; production runs against
 * Turso. Same engine, same SQL dialect, so there is no schema drift between
 * the two environments.
 */
export const databaseUrl = remoteUrl ?? localUrl;

export const sqlite = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(sqlite, { schema });

export { schema };
