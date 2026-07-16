import fs from "fs";

const text = fs.readFileSync("src/features/anime-collection/data/seed-image-urls.ts", "utf8");
const paths = [...text.matchAll(/dlPortrait\("([^"]+)"\)/g)].map((m) => m[1]);
const base = "https://static.wikia.nocookie.net/yugioh/images";

async function check(p) {
  const u = `${base}/${p}/revision/latest/scale-to-width-down/400`;
  try {
    const r = await fetch(u, { method: "HEAD" });
    return [r.status, p];
  } catch {
    return ["ERR", p];
  }
}

for (const p of paths) {
  const [status] = await check(p);
  if (status !== 200) console.log(status, p);
}
console.log("checked", paths.length);
