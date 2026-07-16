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

const master = JSON.parse(
  fs.readFileSync("src/features/anime-collection/data/master-duelists.json", "utf8")
);

const bySeriesName = new Map();
for (const entry of master.duelists) {
  const key = `${entry.series}::${entry.name}`;
  bySeriesName.set(key, entry);
}

const reordered = [];

for (const [series, names] of Object.entries(ORIGINAL_ORDER)) {
  const seen = new Set();
  for (const name of names) {
    const key = `${series}::${name}`;
    const entry = bySeriesName.get(key);
    if (!entry) {
      console.error("Missing original entry:", key);
      process.exit(1);
    }
    reordered.push(entry);
    seen.add(name);
  }
  const added = master.duelists
    .filter((d) => d.series === series && !seen.has(d.name))
    .sort((a, b) => a.arc.localeCompare(b.arc) || a.name.localeCompare(b.name));
  for (const entry of added) {
    reordered.push(entry);
  }
}

master.duelists = reordered;
fs.writeFileSync(
  "src/features/anime-collection/data/master-duelists.json",
  JSON.stringify(master, null, 2) + "\n"
);
console.log("Reordered", reordered.length, "duelists (original IDs preserved)");
