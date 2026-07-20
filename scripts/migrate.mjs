import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not configured. Add it to .env.local or the shell environment.");
  process.exit(1);
}

const sql = neon(connectionString);
const migrationsDirectory = path.join(process.cwd(), "database", "migrations");

await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const [applied] = await sql.query(
    "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS exists",
    [file],
  );

  if (applied.exists) {
    console.log(`Skipping ${file} (already applied)`);
    continue;
  }

  console.log(`Applying ${file}`);
  const migration = await readFile(path.join(migrationsDirectory, file), "utf8");
  const statements = migration
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  await sql.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
  console.log(`Applied ${file}`);
}

console.log("Database schema is up to date.");
