/** YGOPRODeck site + image URL helpers */

export function slugifyCardName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildYgoProDeckUrl(name: string, externalId?: string | null): string {
  if (externalId && name) {
    return `https://ygoprodeck.com/card/${slugifyCardName(name)}-${externalId}`;
  }
  return `https://ygoprodeck.com/card-database/?search=${encodeURIComponent(name)}`;
}

export function buildYgoImageUrl(
  externalId: string | null | undefined,
  size: "full" | "small" | "cropped" = "full"
): string | null {
  if (!externalId) return null;
  const folder = size === "small" ? "cards_small" : size === "cropped" ? "cards_cropped" : "cards";
  return `https://images.ygoprodeck.com/images/${folder}/${externalId}.jpg`;
}

export function pickYgoImageSizeForRarity(rarity: string | null | undefined): "full" | "cropped" {
  if (!rarity) return "full";
  const r = rarity.toLowerCase();
  if (r.includes("secret") || r.includes("ghost") || r.includes("prismatic") || r.includes("starlight")) {
    return "cropped";
  }
  return "full";
}
