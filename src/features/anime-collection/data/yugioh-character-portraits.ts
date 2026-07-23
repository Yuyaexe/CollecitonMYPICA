/** Bundled Yu-Gi-Oh! DM character portraits under `public/anime-characters/yu-gi-oh/`. */
export const YUGIOH_PORTRAIT_BASE_PATH = "/anime-characters/yu-gi-oh";

/** Portrait file slug (filename without extension). Keep in sync with download script. */
export const YUGIOH_PORTRAIT_SLUGS = [
  "aigami",
  "anubis",
  "arkana",
  "bakura",
  "bandit-keith",
  "bonz",
  "dartz",
  "duke-devlin",
  "espa-roba",
  "ishizu-ishtar",
  "joey-wheeler",
  "leon-wilson",
  "lumis-umbra",
  "mai-valentine",
  "mako-tsunami",
  "marik-ishtar",
  "mokuba-kaiba",
  "noah-kaiba",
  "odion",
  "panik",
  "paradox-brothers",
  "pegasus",
  "rafael",
  "rebecca",
  "rex-raptor",
  "seto-kaiba",
  "solomon-muto",
  "tea-gardner",
  "tristan-taylor",
  "weevil-underwood",
  "yami-yugi",
  "yugi-muto",
  "ziegfried",
] as const;

export type YugiohPortraitSlug = (typeof YUGIOH_PORTRAIT_SLUGS)[number];

const PORTRAIT_SLUG_SET = new Set<string>(YUGIOH_PORTRAIT_SLUGS);

/**
 * Maps slugified character names (EN/PT variants) to bundled portrait slugs.
 * Keys must match `slugifyAnimeName(name)`.
 */
export const YUGIOH_PORTRAIT_ALIASES: Record<string, YugiohPortraitSlug> = {
  "yugi-moto": "yugi-muto",
  "yugi-mutou": "yugi-muto",
  "yugi-mut": "yugi-muto",
  "atem": "yami-yugi",
  "pharaoh": "yami-yugi",
  "ryou-bakura": "bakura",
  "ryo-bakura": "bakura",
  "bakura-ryou": "bakura",
  "yami-bakura": "bakura",
  "téa-gardner": "tea-gardner",
  "tea-gardner": "tea-gardner",
  "téa": "tea-gardner",
  "mai-kujaku": "mai-valentine",
  "maximillion-pegasus": "pegasus",
  "maximillian-pegasus": "pegasus",
  "pegasus": "pegasus",
  "marik": "marik-ishtar",
  "yami-marik": "marik-ishtar",
  "solomon-mutou": "solomon-muto",
  "grandpa-yugi": "solomon-muto",
  "vo-do-yugi": "solomon-muto",
  "irmaos-paradox": "paradox-brothers",
  "irma-paradox": "paradox-brothers",
  "paradox-brothers": "paradox-brothers",
  "lumis-and-umbra": "lumis-umbra",
  "rebecca-hawkins": "rebecca",
  "mokuba": "mokuba-kaiba",
  "weevil": "weevil-underwood",
  "rex": "rex-raptor",
  "keith-howard": "bandit-keith",
  "espa": "espa-roba",
  "devlin": "duke-devlin",
  "ishizu": "ishizu-ishtar",
  "mako": "mako-tsunami",
  "noah": "noah-kaiba",
  "leo": "leon-wilson",
  "leon": "leon-wilson",
  "tristan": "tristan-taylor",
  "honda": "tristan-taylor",
  "ziegfried": "ziegfried",
  "zigfried": "ziegfried",
  "siegfried": "ziegfried",
  "zigfried-von-schroeder": "ziegfried",
  "ziegfried-von-schroeder": "ziegfried",
  "anubis": "anubis",
  "panik": "panik",
  "panic": "panik",
};

export function isBundledYugiohPortraitSlug(slug: string): slug is YugiohPortraitSlug {
  return PORTRAIT_SLUG_SET.has(slug);
}
