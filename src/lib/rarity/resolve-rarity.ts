export interface RarityStyle {
  code: string;
  label: string;
  className: string;
}

/** Yu-Gi-Oh! rarity tag colors inspired by Cardmarket / YGOProDeck conventions */
function resolveYugiohRarity(rarity: string): RarityStyle {
  const n = rarity.toLowerCase();
  const label = rarity;

  if (n.includes("quarter century secret")) {
    return { code: "QSCR", label, className: "bg-sky-500 text-white" };
  }
  if (n.includes("prismatic secret")) {
    return { code: "PMSCR", label, className: "bg-purple-600 text-white" };
  }
  if (n.includes("platinum secret")) {
    return { code: "PLSCR", label, className: "bg-violet-300 text-violet-950" };
  }
  if (n.includes("ghost") || n.includes("ghr")) {
    return { code: "GHR", label, className: "bg-black text-white ring-1 ring-white/20" };
  }
  if (n.includes("starlight")) {
    return { code: "SLR", label, className: "bg-black text-white ring-1 ring-white/20" };
  }
  if (n.includes("pharaoh") || n.includes("phru")) {
    return { code: "PHRU", label, className: "bg-black text-white ring-1 ring-white/20" };
  }
  if (n.includes("gold secret") || n.includes("gscr")) {
    return { code: "GSCR", label, className: "bg-amber-800 text-amber-50" };
  }
  if (n.includes("ghost gold") || n.includes("ghgr")) {
    return { code: "GHGR", label, className: "bg-amber-900 text-amber-100" };
  }
  if (n.includes("gold rare") || (n.includes("gold") && n.includes("rare"))) {
    return { code: "GR", label, className: "bg-yellow-700 text-white" };
  }
  if (n.includes("platinum")) {
    return { code: "PLR", label, className: "bg-slate-400 text-white" };
  }
  if (n.includes("prismatic collector") || n.includes("pcr")) {
    return { code: "PCR", label, className: "bg-cyan-400 text-cyan-950" };
  }
  if (n.includes("collector")) {
    return { code: "CR", label, className: "bg-teal-500 text-white" };
  }
  if (n.includes("ultimate")) {
    return { code: "UMR", label, className: "bg-cyan-500 text-white" };
  }
  if (n.includes("premium") && n.includes("ultra")) {
    return { code: "PMUR", label, className: "bg-cyan-600 text-white" };
  }
  if (n.includes("parallel") && n.includes("ultra")) {
    return { code: "PUR", label, className: "bg-yellow-500 text-yellow-950" };
  }
  if (n.includes("parallel") && n.includes("super")) {
    return { code: "PSR", label, className: "bg-orange-500 text-white" };
  }
  if (n.includes("parallel") && n.includes("common")) {
    return { code: "PC", label, className: "bg-neutral-200 text-neutral-700" };
  }
  if (n.includes("duel terminal") || n.startsWith("dt")) {
    if (n.includes("secret")) return { code: "DTSCR", label, className: "bg-purple-700 text-white" };
    if (n.includes("ultra")) return { code: "DTUR", label, className: "bg-yellow-600 text-yellow-950" };
    if (n.includes("super")) return { code: "DTSR", label, className: "bg-orange-600 text-white" };
    return { code: "DTR", label, className: "bg-neutral-500 text-white" };
  }
  if (n.includes("10000") || n.includes("10k")) {
    return { code: "10K", label, className: "bg-red-700 text-white" };
  }
  if (n.includes("extr") && n.includes("secret")) {
    return { code: "EXSCR", label, className: "bg-red-600 text-white" };
  }
  if (n.includes("gimmick") || n.includes("gmr")) {
    return { code: "GMR", label, className: "bg-red-800 text-white" };
  }
  if (n.includes("shatterfoil") || n.includes("sfr")) {
    return { code: "SFR", label, className: "bg-rose-900/80 text-rose-100" };
  }
  if (n.includes("mosaic") || n.includes("msr")) {
    return { code: "MSR", label, className: "bg-stone-600 text-white" };
  }
  if (n.includes("short print") || n.includes("shr")) {
    return { code: "SHR", label, className: "bg-stone-500 text-white" };
  }
  if (n.includes("secret")) {
    return { code: "SCR", label, className: "bg-purple-600 text-white" };
  }
  if (n.includes("ultra")) {
    return { code: "UR", label, className: "bg-yellow-500 text-yellow-950" };
  }
  if (n.includes("super")) {
    return { code: "SR", label, className: "bg-orange-500 text-white" };
  }
  if (n.includes("rare")) {
    return { code: "R", label, className: "bg-neutral-500 text-white" };
  }
  if (n.includes("common")) {
    return { code: "C", label, className: "bg-neutral-300 text-neutral-700" };
  }

  const code = rarity
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return { code: code || "?", label, className: "bg-muted text-muted-foreground" };
}

function resolveGenericRarity(rarity: string): RarityStyle {
  const n = rarity.toLowerCase();
  const label = rarity;

  if (n.includes("secret") || n.includes("hyper") || n.includes("illustration")) {
    return { code: abbreviate(rarity, 4), label, className: "bg-purple-600 text-white" };
  }
  if (n.includes("ultra") || n.includes("holo") || n.includes("ex ") || n.endsWith(" ex")) {
    return { code: abbreviate(rarity, 3), label, className: "bg-yellow-500 text-yellow-950" };
  }
  if (n.includes("super") || n.includes("rare holo")) {
    return { code: abbreviate(rarity, 3), label, className: "bg-orange-500 text-white" };
  }
  if (n.includes("rare") || n.includes("uncommon")) {
    return { code: abbreviate(rarity, 2), label, className: "bg-neutral-500 text-white" };
  }
  if (n.includes("common") || n.includes("promo")) {
    return { code: abbreviate(rarity, 2), label, className: "bg-neutral-300 text-neutral-700" };
  }

  return {
    code: abbreviate(rarity, 4),
    label,
    className: "bg-muted text-muted-foreground",
  };
}

function abbreviate(text: string, maxLen: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, maxLen)
      .toUpperCase();
  }
  return text.slice(0, maxLen).toUpperCase();
}

export function resolveRarityStyle(
  rarity: string | null | undefined,
  gameSlug?: string
): RarityStyle | null {
  if (!rarity?.trim()) return null;

  if (gameSlug === "yugioh") {
    return resolveYugiohRarity(rarity.trim());
  }

  return resolveGenericRarity(rarity.trim());
}
