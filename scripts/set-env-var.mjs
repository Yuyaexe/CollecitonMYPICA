import fs from "node:fs";

const [key, value] = process.argv.slice(2);
if (!key || !value) {
  console.error("Usage: node scripts/set-env-var.mjs KEY VALUE");
  process.exit(1);
}

const path = ".env.local";
let content = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const pattern = new RegExp(`^${key}=.*$`, "m");

if (pattern.test(content)) {
  content = content.replace(pattern, `${key}=${value}`);
} else {
  if (content.length && !content.endsWith("\n")) content += "\n";
  content += `${key}=${value}\n`;
}

fs.writeFileSync(path, content);
console.log(`Set ${key} in .env.local`);
