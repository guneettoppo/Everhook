import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

/**
 * Runs once before any test file: wipes the test database and applies all
 * drizzle migrations in journal order.
 *
 * We apply the .sql files directly instead of drizzle's migrate() because the
 * migration set contains an empty migration (0002), which the migrator's
 * journal ordering mishandles when re-applying from scratch.
 */
export default async function globalSetup() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);

  const dir = resolve(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // lexicographic = journal order (0000_..., 0001_..., ...)

  for (const file of files) {
    const sql = readFileSync(resolve(dir, file), "utf8");
    await pool.query(sql);
  }

  await pool.end();
}
