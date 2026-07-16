const names = [
  "MaiValentine", "WeevilUnderwood", "RexRaptor", "MakoTsunami", "EspaRoba",
  "LumisandUmbra", "JadenYuki", "SyrusTruesdale", "ZaneTruesdale", "Yubel",
  "OfficerTetsuTrudge", "TetsuTrudge", "Zone", "Z-one", "KiteTenjo", "BronkStone",
  "Trey", "Quattro", "Quinton", "YuyaSakaki", "GongStrong", "SylvioSawatari",
  "Yuto", "Yugo", "Yuri", "Rin", "Soulburner", "Varis", "Spectre", "AkiraZaizen",
];

const base = "https://static.wikia.nocookie.net/yugioh/images";

async function tryPath(path) {
  const u = `${base}/${path}/revision/latest/scale-to-width-down/400`;
  try {
    const r = await fetch(u, { method: "HEAD" });
    return r.status === 200 ? path : null;
  } catch {
    return null;
  }
}

for (const name of names) {
  const candidates = [
    `${name.charAt(0).toLowerCase()}/${name.slice(1, 3)}/${name}-DULI.png`,
    `3/3c/Profile-DULI-${name}.png`,
    `4/40/Profile-DULI-${name}.png`,
    `e/ef/Profile-DULI-${name}.png`,
    `f/f1/Profile-DULI-${name}.png`,
    `9/91/Profile-DULI-${name}.png`,
    `1/15/Profile-DULI-${name}.png`,
    `6/60/Profile-DULI-${name}.png`,
    `8/84/Profile-DULI-${name}.png`,
    `d/d6/Profile-DULI-${name}.png`,
  ];
  for (const c of candidates) {
    const ok = await tryPath(c);
    if (ok) {
      console.log(name, "->", ok);
      break;
    }
  }
}
