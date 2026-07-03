import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const files = [
  "0001_seed_and_indexes.sql",
  "0002_rls_policies.sql",
  "0003_collaboration.sql",
];

const sql = postgres(DATABASE_URL, { max: 1 });

try {
  for (const file of files) {
    const filePath = path.join("src/lib/db/migrations", file);
    console.log(`Running ${filePath}...`);
    await sql.unsafe(fs.readFileSync(filePath, "utf8"));
    console.log(`OK ${filePath}`);
  }
  console.log("All migrations applied.");
} finally {
  await sql.end();
}
