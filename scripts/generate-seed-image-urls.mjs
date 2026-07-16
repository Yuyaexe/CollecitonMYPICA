import fs from "fs";

const portraits = JSON.parse(
  fs.readFileSync("scripts/generated-dl-portraits.json", "utf8")
);

portraits["Supreme King Jaden"] =
  "https://static.wikia.nocookie.net/yugioh/images/2/2e/SupremeKing-DULI.png/revision/latest/scale-to-width-down/400?cb=20210701124811";
portraits["Officer Tetsu Trudge"] =
  "https://static.wikia.nocookie.net/yugioh/images/2/2f/OfficerTetsuTrudge-DULI.png/revision/latest/scale-to-width-down/400?cb=20181031034430";
portraits["Dark Signer Rex Goodwin"] =
  "https://static.wikia.nocookie.net/yugioh/images/3/30/DarkSignerRexGoodwin-DULI.png/revision/latest/scale-to-width-down/400?cb=20191205173117";

const lines = Object.entries(portraits)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, url]) => `  ${JSON.stringify(name)}: ${JSON.stringify(url)},`)
  .join("\n");

const covers = {
  yugioh: portraits["Yami Yugi"],
  "yugioh-gx": portraits["Jaden Yuki"],
  "yugioh-5ds": portraits["Yusei Fudo"],
  "yugioh-zexal": portraits["Yuma and Astral"],
  "yugioh-arc-v": portraits["Yuya Sakaki"],
  "yugioh-vrains": portraits["Playmaker and Ai"],
};

const coverLines = Object.entries(covers)
  .map(([slug, url]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(url)},`)
  .join("\n");

const out = `/** Auto-verified Duel Links portrait URLs (Yu-Gi-Oh! Fandom wiki). */
export const DL_PORTRAIT_URLS: Record<string, string | null> = {
${lines}
};

export const SERIES_COVER_URLS: Record<string, string> = {
${coverLines}
};

const ALIASES: Record<string, string> = {
  "Maximilian Pegasus": "Maximillion Pegasus",
  "Ryo Bakura": "Yami Bakura",
};

export function getDlPortrait(name: string): string | null {
  const direct = DL_PORTRAIT_URLS[name];
  if (direct) return direct;
  const alias = ALIASES[name];
  return alias ? DL_PORTRAIT_URLS[alias] ?? null : null;
}

export function getSeriesCover(slug: string): string | null {
  return SERIES_COVER_URLS[slug] ?? null;
}
`;

fs.writeFileSync("src/features/anime-collection/data/seed-image-urls.ts", out);
console.log("Wrote seed-image-urls.ts");
