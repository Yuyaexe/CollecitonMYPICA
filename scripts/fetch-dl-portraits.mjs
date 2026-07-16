import fs from "fs";

const master = JSON.parse(
  fs.readFileSync("src/features/anime-collection/data/master-duelists.json", "utf8")
);

const WIKI_TITLES = {
  "Yuma and Astral": "Yuma_and_Astral",
  "Playmaker and Ai": "Playmaker_and_Ai",
  "Paradox Brothers": "Paradox_Brothers_(Duel_Links)",
  "Lumis and Umbra": "Lumis_and_Umbra_(Duel_Links)",
  "Jaden/Yubel": "Jaden/Yubel_(Duel_Links)",
  "Dark Signer Kalin Kessler": "Dark_Signer_Kalin_Kessler",
  "Dark Signer Carly Carmine": "Dark_Signer_Carly_Carmine",
  "Dark Signer Rex Goodwin": "Dark_Signer_Rex_Goodwin",
  "Dark Signer Roman Goodwin": "Dark_Signer_Roman_Goodwin",
  "Dark Signer Devack": "Dark_Signer_Devack",
  "Dark Signer Greiger": "Dark_Signer_Greiger",
  "Dark Signer Misty Lola": "Dark_Signer_Misty_Lola",
  "Supreme King Jaden": "Supreme_King_Jaden",
  'Reginald "Shark" Kastle': "Reginald_Kastle_(Duel_Links)",
  'Jim "Crocodile" Cook': "Jim_Crocodile_Cook_(Duel_Links)",
  "Z-one": "Z-one_(Duel_Links)",
  "Rebecca Hawkins": "Rebecca_Hawkins_(Duel_Links)",
  "Ghost Kotsuzuka": "Ghost_Kotsuzuka_(Duel_Links)",
  "Noah Kaiba": "Noah_Kaiba_(Duel_Links)",
  "Rafael": "Rafael_(Duel_Links)",
  "Valon": "Valon_(Duel_Links)",
  "Alister": "Alister_(Duel_Links)",
  "Dartz": "Dartz_(Duel_Links)",
  "Atticus Rhodes": "Atticus_Rhodes_(Duel_Links)",
  "Adrian Gecko": "Adrian_Gecko_(Duel_Links)",
  "Kagemaru": "Kagemaru_(Duel_Links)",
  "Camula": "Camula_(Duel_Links)",
  "Tania": "Tania_(Duel_Links)",
  "Abidos the Third": "Abidos_the_Third_(Duel_Links)",
  "Roman Goodwin": "Roman_Goodwin_(Duel_Links)",
  "Devack": "Devack_(Duel_Links)",
  "Greiger": "Greiger_(Duel_Links)",
  "Vector": "Vector_(Duel_Links)",
  "Dr. Faker": "Dr._Faker_(Duel_Links)",
  "Moon Shadow": "Moon_Shadow_(Duel_Links)",
  "Sun Shadow": "Sun_Shadow_(Duel_Links)",
  "Bohman": "Bohman_(Duel_Links)",
  "Lightning": "Lightning_(Duel_Links)",
  "Flame": "Flame_(Duel_Links)",
  "Aqua": "Aqua_(Duel_Links)",
  "Earth": "Earth_(Duel_Links)",
  "Windy": "Windy_(Duel_Links)",
  "Queen": "Queen_(Duel_Links)",
};

const CHARACTERS = [...new Set(master.duelists.map((d) => d.name))].sort((a, b) =>
  a.localeCompare(b)
);

function wikiTitle(name) {
  return WIKI_TITLES[name] ?? `${name.replace(/ /g, "_")}_(Duel_Links)`;
}

function normalizeThumb(url) {
  return url.replace(/scale-to-width-down\/\d+/, "scale-to-width-down/400");
}

async function fetchBatch(entries) {
  const q = entries.map((e) => encodeURIComponent(e.title)).join("|");
  const api = `https://yugioh.fandom.com/api.php?action=query&titles=${q}&prop=pageimages&pithumbsize=400&format=json`;
  const res = await fetch(api);
  const json = await res.json();

  const titleByFrom = new Map(
    (json.query?.normalized ?? []).map((n) => [n.from.replace(/ /g, "_"), n.to])
  );

  const out = new Map();
  for (const entry of entries) {
    const page = Object.values(json.query?.pages ?? {}).find((p) => {
      const expected = titleByFrom.get(entry.title) ?? entry.title.replace(/_/g, " ");
      return p.title === expected || p.title?.replace(/ \(Duel Links\)$/, "") === entry.name;
    });
    if (page?.thumbnail?.source) {
      out.set(entry.name, normalizeThumb(page.thumbnail.source));
    }
  }
  return out;
}

const entries = CHARACTERS.map((name) => ({ name, title: wikiTitle(name) }));
const results = {};

let existing = {};
try {
  existing = JSON.parse(fs.readFileSync("scripts/generated-dl-portraits.json", "utf8"));
} catch {
  /* fresh run */
}

for (let i = 0; i < entries.length; i += 15) {
  const batch = entries.slice(i, i + 15);
  const thumbs = await fetchBatch(batch);
  for (const entry of batch) {
    const url = thumbs.get(entry.name) ?? existing[entry.name] ?? null;
    results[entry.name] = url;
    console.log(entry.name, url ? "OK" : "MISSING", entry.title);
  }
  await new Promise((r) => setTimeout(r, 300));
}

fs.writeFileSync(
  "scripts/generated-dl-portraits.json",
  JSON.stringify(results, null, 2) + "\n"
);
console.log(`\nWrote ${Object.keys(results).length} portraits (${Object.values(results).filter(Boolean).length} with URLs)`);
