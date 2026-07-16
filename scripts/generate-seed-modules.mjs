import fs from "fs";

const ORIGINAL_ORDER = {
  yugioh: [
    "Yami Yugi", "Yugi Muto", "Seto Kaiba", "Joey Wheeler", "Téa Gardner", "Mai Valentine",
    "Tristan Taylor", "Mokuba Kaiba", "Weevil Underwood", "Rex Raptor", "Mako Tsunami",
    "Maximillion Pegasus", "Bandit Keith", "Ishizu Ishtar", "Odion", "Yami Bakura",
    "Yami Marik", "Arkana", "Bonz", "Espa Roba", "Paradox Brothers", "Lumis and Umbra",
    "Duke Devlin", "Solomon Muto",
  ],
  "yugioh-gx": [
    "Jaden Yuki", "Chazz Princeton", "Alexis Rhodes", "Syrus Truesdale", "Zane Truesdale",
    "Aster Phoenix", "Jesse Anderson", "Bastion Misawa", "Dr. Vellian Crowler",
    "Tyranno Hassleberry", "Sartorius Kumar", "Blair Flannigan", "Axel Brodie",
    'Jim "Crocodile" Cook', "Yubel", "Supreme King Jaden", "Jaden/Yubel",
  ],
  "yugioh-5ds": [
    "Yusei Fudo", "Jack Atlas", "Crow Hogan", "Akiza Izinski", "Leo", "Luna",
    "Officer Tetsu Trudge", "Kalin Kessler", "Carly Carmine", "Dark Signer Kalin Kessler",
    "Dark Signer Carly Carmine", "Dark Signer Rex Goodwin", "Antinomy", "Primo", "Aporia",
    "Paradox", "Z-one", "Sherry LeBlanc",
  ],
  "yugioh-zexal": [
    "Yuma and Astral", 'Reginald "Shark" Kastle', "Rio Kastle", "Kite Tenjo", "Tori Meadows",
    "Bronk Stone", "Trey", "Quattro", "Quinton", "Anna Kaboom", "Girag", "Alito", "Mizar", "Dumon",
  ],
  "yugioh-arc-v": [
    "Yuya Sakaki", "Zuzu Boyle", "Gong Strong", "Sylvio Sawatari", "Declan Akaba", "Sora Perse",
    "Shay Obsidian", "Yuto", "Yugo", "Yuri", "Celina", "Lulu Obsidian", "Rin", "Dennis McField",
  ],
  "yugioh-vrains": [
    "Playmaker and Ai", "Soulburner", "Blue Angel", "The Gore", "Ghost Gal", "Varis", "Spectre",
    "Akira Zaizen",
  ],
};

function orderDuelists(duelists) {
  const bySeriesName = new Map();
  for (const entry of duelists) {
    bySeriesName.set(`${entry.series}::${entry.name}`, entry);
  }

  const reordered = [];
  for (const [series, names] of Object.entries(ORIGINAL_ORDER)) {
    const seen = new Set();
    for (const name of names) {
      const entry = bySeriesName.get(`${series}::${name}`);
      if (entry) {
        reordered.push(entry);
        seen.add(name);
      }
    }
    const added = duelists
      .filter((d) => d.series === series && !seen.has(d.name))
      .sort((a, b) => a.arc.localeCompare(b.arc) || a.name.localeCompare(b.name));
    reordered.push(...added);
  }
  return reordered;
}

const masterRaw = JSON.parse(
  fs.readFileSync("src/features/anime-collection/data/master-duelists.json", "utf8")
);
const master = { ...masterRaw, duelists: orderDuelists(masterRaw.duelists) };
fs.writeFileSync(
  "src/features/anime-collection/data/master-duelists.json",
  JSON.stringify(master, null, 2) + "\n"
);

const SERIES_META = {
  yugioh: { name: "Yu-Gi-Oh!", slug: "yugioh", coverColor: "#1e3a5f", file: "yugioh.ts" },
  "yugioh-gx": { name: "Yu-Gi-Oh! GX", slug: "yugioh-gx", coverColor: "#14532d", file: "yugioh-gx.ts" },
  "yugioh-5ds": { name: "Yu-Gi-Oh! 5D's", slug: "yugioh-5ds", coverColor: "#374151", file: "yugioh-5ds.ts" },
  "yugioh-zexal": { name: "Yu-Gi-Oh! Zexal", slug: "yugioh-zexal", coverColor: "#312e81", file: "yugioh-zexal.ts" },
  "yugioh-arc-v": { name: "Yu-Gi-Oh! Arc-V", slug: "yugioh-arc-v", coverColor: "#7c2d12", file: "yugioh-arc-v.ts" },
  "yugioh-vrains": { name: "Yu-Gi-Oh! VRAINS", slug: "yugioh-vrains", coverColor: "#0f172a", file: "yugioh-vrains.ts" },
};

const outDir = "src/features/anime-collection/data/seeds";
fs.mkdirSync(outDir, { recursive: true });

for (const [seriesKey, meta] of Object.entries(SERIES_META)) {
  const duelists = master.duelists.filter((d) => d.series === seriesKey);
  const charLines = duelists.map(
    (d) => `    seedChar(${JSON.stringify(d.name)}, ${JSON.stringify(d.accentColor)}),`
  );

  const content = `import { seedChar } from "@/features/anime-collection/data/seeds/shared";
import { getSeriesCover } from "@/features/anime-collection/data/seed-image-urls";
import type { AnimeSeedSeries } from "@/features/anime-collection/data/seeds/shared";

export const ${seriesKey.replace(/-/g, "_").toUpperCase()}_SEED: AnimeSeedSeries = {
  name: ${JSON.stringify(meta.name)},
  slug: ${JSON.stringify(meta.slug)},
  coverImageUrl: getSeriesCover(${JSON.stringify(meta.slug)}),
  coverColor: ${JSON.stringify(meta.coverColor)},
  characters: [
${charLines.join("\n")}
  ],
};
`;

  fs.writeFileSync(`${outDir}/${meta.file}`, content);
  console.log(`Wrote ${meta.file} (${duelists.length} characters)`);
}

const indexContent = `import type { AnimeSeedSeries } from "@/features/anime-collection/data/seeds/shared";
import { YUGIOH_SEED } from "@/features/anime-collection/data/seeds/yugioh";
import { YUGIOH_GX_SEED } from "@/features/anime-collection/data/seeds/yugioh-gx";
import { YUGIOH_5DS_SEED } from "@/features/anime-collection/data/seeds/yugioh-5ds";
import { YUGIOH_ZEXAL_SEED } from "@/features/anime-collection/data/seeds/yugioh-zexal";
import { YUGIOH_ARC_V_SEED } from "@/features/anime-collection/data/seeds/yugioh-arc-v";
import { YUGIOH_VRAINS_SEED } from "@/features/anime-collection/data/seeds/yugioh-vrains";

export const ANIME_SEED: AnimeSeedSeries[] = [
  YUGIOH_SEED,
  YUGIOH_GX_SEED,
  YUGIOH_5DS_SEED,
  YUGIOH_ZEXAL_SEED,
  YUGIOH_ARC_V_SEED,
  YUGIOH_VRAINS_SEED,
];
`;

fs.writeFileSync(`${outDir}/index.ts`, indexContent);

const sharedContent = `import { getDlPortrait } from "@/features/anime-collection/data/seed-image-urls";

export interface AnimeSeedSeries {
  name: string;
  slug: string;
  coverImageUrl: string | null;
  coverColor?: string;
  characters: Array<{
    name: string;
    imageUrl: string | null;
    accentColor?: string;
  }>;
}

export function seedChar(name: string, accentColor: string) {
  return {
    name,
    imageUrl: getDlPortrait(name),
    accentColor,
  };
}
`;

fs.writeFileSync(`${outDir}/shared.ts`, sharedContent);
console.log("Wrote index.ts and shared.ts");
