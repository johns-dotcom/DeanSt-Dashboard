import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Allow build-time imports without DATABASE_URL set
  console.warn("DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

const sql = globalThis.__sql ?? postgres(connectionString ?? "postgres://invalid", { max: 10 });
if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;

export const db = drizzle(sql, { schema });
export type DB = typeof db;
export * from "./schema";
