import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const DATABASE_URL = "postgresql://deckvault:deckvault@localhost:5432/deckvault";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL } });
}

async function waitForPostgres() {
  for (let i = 0; i < 30; i++) {
    try {
      const status = execSync(
        "docker inspect --format={{.State.Health.Status}} deckvault-postgres",
        { encoding: "utf8" }
      ).trim();
      if (status === "healthy") return;
    } catch {
      /* container not ready */
    }
    await sleep(2000);
  }
  throw new Error("Postgres did not become healthy in time.");
}

console.log("Starting DeckVault Docker stack...");
run("docker compose up -d postgres adminer");

console.log("Waiting for Postgres...");
await waitForPostgres();

process.env.DATABASE_URL = DATABASE_URL;
console.log("Pushing Drizzle schema...");
run("npm run db:push");

console.log("Seeding demo collections and cards...");
run("node scripts/seed-demo-data.mjs");

console.log("\nReady!");
console.log("  Adminer: http://localhost:8080");
console.log("  System: PostgreSQL | Server: postgres");
console.log("  User: deckvault | Password: deckvault | Database: deckvault");
console.log("  Drizzle Studio: npm run db:studio");
console.log("  App: npm run dev");
