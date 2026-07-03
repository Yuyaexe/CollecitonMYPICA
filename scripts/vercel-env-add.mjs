import fs from "node:fs";
import { spawnSync } from "node:child_process";

function loadEnvLocal() {
  const env = {};
  if (!fs.existsSync(".env.local")) return env;
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const key = process.argv[2];
const environments = process.argv.slice(3);
if (!key || environments.length === 0) {
  console.error("Usage: node scripts/vercel-env-add.mjs KEY production preview development");
  process.exit(1);
}

const env = loadEnvLocal();
const value = env[key];
if (!value) {
  console.error(`${key} not found in .env.local`);
  process.exit(1);
}

for (const environment of environments) {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, environment, "--force"],
    {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`Set ${key} for ${environment}`);
}
