import fs from "fs";

const master = JSON.parse(
  fs.readFileSync("src/features/anime-collection/data/master-duelists.json", "utf8")
);

const SERIES_LABELS = {
  yugioh: "Yu-Gi-Oh!",
  "yugioh-gx": "Yu-Gi-Oh! GX",
  "yugioh-5ds": "Yu-Gi-Oh! 5D's",
  "yugioh-zexal": "Yu-Gi-Oh! Zexal",
  "yugioh-arc-v": "Yu-Gi-Oh! Arc-V",
  "yugioh-vrains": "Yu-Gi-Oh! VRAINS",
};

const bySeries = new Map();
for (const entry of master.duelists) {
  if (!bySeries.has(entry.series)) bySeries.set(entry.series, []);
  bySeries.get(entry.series).push(entry);
}

const lines = [
  "# Yu-Gi-Oh! Anime Duelists (6 Series)",
  "",
  `Compiled: ${master.compiledAt}`,
  "",
  `**Total duelists:** ${master.duelists.length}`,
  "",
  master.criteria,
  "",
  "## Summary by series",
  "",
  "| Series | Count |",
  "|--------|-------|",
];

for (const [slug, label] of Object.entries(SERIES_LABELS)) {
  const count = bySeries.get(slug)?.length ?? 0;
  lines.push(`| ${label} | ${count} |`);
}

lines.push("", "## Index", "");

for (const [slug, label] of Object.entries(SERIES_LABELS)) {
  lines.push(`- [${label}](#${slug})`);
}

for (const [slug, label] of Object.entries(SERIES_LABELS)) {
  const entries = bySeries.get(slug) ?? [];
  lines.push("", `## ${label} {#${slug}}`, "");
  lines.push(`**${entries.length} duelists**`, "");

  const byArc = new Map();
  for (const entry of entries) {
    if (!byArc.has(entry.arc)) byArc.set(entry.arc, []);
    byArc.get(entry.arc).push(entry);
  }

  for (const [arc, arcEntries] of byArc) {
    lines.push(`### ${arc}`, "");
    lines.push("| Name | In seed | Aliases |");
    lines.push("|------|---------|---------|");
    for (const e of arcEntries) {
      const aliases = e.aliases?.length ? e.aliases.join(", ") : "—";
      const inSeed = e.inOriginalSeed ? "original" : "added";
      lines.push(`| ${e.name} | ${inSeed} | ${aliases} |`);
    }
    lines.push("");
  }
}

lines.push("## Aliases reference", "");
lines.push("| Canonical name | Also known as |");
lines.push("|----------------|---------------|");
const aliasRows = master.duelists.filter((e) => e.aliases?.length);
for (const e of aliasRows) {
  lines.push(`| ${e.name} | ${e.aliases.join(", ")} |`);
}

const outPath = "docs/anime-collection/yugioh-duelists.md";
fs.mkdirSync("docs/anime-collection", { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${outPath} (${master.duelists.length} duelists)`);
