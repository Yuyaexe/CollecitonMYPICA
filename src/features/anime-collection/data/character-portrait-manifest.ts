import type { AnimeSeriesAssetKey } from "@/features/anime-collection/data/anime-series-key";
import {
  YUGIOH_PORTRAIT_ALIASES,
  YUGIOH_PORTRAIT_SLUGS,
} from "@/features/anime-collection/data/yugioh-character-portraits";

export interface CharacterPortraitSeriesConfig {
  basePath: string;
  slugs: readonly string[];
  aliases: Record<string, string>;
}

const GX_PORTRAIT_SLUGS = [
  "jaden",
  "alexis",
  "syrus",
  "zane",
  "chazz",
  "camula",
  "lorenzo",
  "sartorius",
  "aster-phoenix",
  "yubel",
  "viper",
  "atticus",
  "jim",
  "axel",
  "jesse",
  "crowler",
  "bonaparte",
  "shepard",
  "bastion",
  "tyranno-hassleberry",
  "blair",
  "yusuke-fujiwara",
  "professor-banner",
  "chumley",
  "sarina",
  "adrian-gecko",
  "kagemaru",
  "marcel",
  "abidos-the-third",
  "belowski",
] as const;

const GX_PORTRAIT_ALIASES: Record<string, string> = {
  "jaden-yuki": "jaden",
  "alexis-rhodes": "alexis",
  "asuka": "alexis",
  "syrus-truesdale": "syrus",
  "sho": "syrus",
  "zane-truesdale": "zane",
  "chazz-princeton": "chazz",
  "manjoume": "chazz",
  "sartorius-kumar": "sartorius",
  "thelonious-viper": "viper",
  "professor-cobra": "viper",
  "atticus-rhodes": "atticus",
  "jim-crocodile-cook": "jim",
  "axel-brodie": "axel",
  "jesse-anderson": "jesse",
  "johan-andersen": "jesse",
  "dr-crowler": "crowler",
  "vellian-crowler": "crowler",
  "jean-louis-bonaparte": "bonaparte",
  "napoleon": "bonaparte",
  "chancellor-sheppard": "shepard",
  "chancellor-shepard": "shepard",
  "sheppard": "shepard",
  chepard: "shepard",
  cheppard: "shepard",
  belowski: "belowski",
  "bastion-misawa": "bastion",
  "tyranno-hassleberry": "tyranno-hassleberry",
  "blair-flannigan": "blair",
  "yusuke-fujiwara": "yusuke-fujiwara",
  "lyman-banner": "professor-banner",
  "amnael": "professor-banner",
  "chumley-huffington": "chumley",
  "adrian-gecko": "adrian-gecko",
  "amon-garam": "adrian-gecko",
  "marcel-bonaparte": "marcel",
  "martin-kanou": "marcel",
  "abidos-the-third": "abidos-the-third",
};

const ARCV_PORTRAIT_SLUGS = [
  "yuya",
  "yuri",
  "yuto",
  "yugo",
  "yuzu",
  "serena",
  "ruri",
  "rin",
  "reiji-akaba",
  "gong-strong",
  "sora",
  "frederick",
  "allie",
  "sawatari",
  "shijima",
  "julia",
  "kit",
  "shun",
  "isao",
  "mieru",
  "chojiro-tokumatsu",
  "gloria-tyler",
  "grace-tyler",
  "allen-kozuki",
  "dennis",
  "battle-beast",
] as const;

const ARCV_PORTRAIT_ALIASES: Record<string, string> = {
  "yuya-sakaki": "yuya",
  "zuzu-boyle": "yuzu",
  "zuzu": "yuzu",
  "celina": "serena",
  "ruri-kurosaki": "ruri",
  "reiji-akaba": "reiji-akaba",
  "akaba-reiji": "reiji-akaba",
  "declan-akaba": "reiji-akaba",
  "gongstrong": "gong-strong",
  "gong-en": "gong-strong",
  "sora-shiunin": "sora",
  "sora-shiun-in": "sora",
  "ally": "allie",
  "ally-sanchez": "allie",
  "sylvio-sawatari": "sawatari",
  "shingo-sawatari": "sawatari",
  "dipper-orion": "shijima",
  "dipper-o-rion": "shijima",
  "shidou": "shijima",
  "julia-krystal": "julia",
  "kit-blade": "kit",
  "shay-obsidian": "shun",
  "shun-tokugawa": "shun",
  "iggy-arlo": "isao",
  "isao-kachidoki": "isao",
  "aura-sentia": "mieru",
  "mieru-hochi": "mieru",
  "choujirou-tokumatsu": "chojiro-tokumatsu",
  "tokumatsu": "chojiro-tokumatsu",
  "alien-kozuki": "allen-kozuki",
  "allen-kozuki": "allen-kozuki",
  "dennis-mcfield": "dennis",
  "battle-beast": "battle-beast",
};

export const CHARACTER_PORTRAIT_MANIFEST: Record<
  AnimeSeriesAssetKey,
  CharacterPortraitSeriesConfig | undefined
> = {
  "yu-gi-oh": {
    basePath: "/anime-characters/yu-gi-oh",
    slugs: YUGIOH_PORTRAIT_SLUGS,
    aliases: YUGIOH_PORTRAIT_ALIASES,
  },
  "yu-gi-oh-gx": {
    basePath: "/anime-characters/yu-gi-oh-gx",
    slugs: GX_PORTRAIT_SLUGS,
    aliases: GX_PORTRAIT_ALIASES,
  },
  "yu-gi-oh-arc-v": {
    basePath: "/anime-characters/yu-gi-oh-arc-v",
    slugs: ARCV_PORTRAIT_SLUGS,
    aliases: ARCV_PORTRAIT_ALIASES,
  },
  "yu-gi-oh-5ds": undefined,
  "yu-gi-oh-zexal": undefined,
  "yu-gi-oh-vrains": undefined,
};

export function getCharacterPortraitConfig(
  key: AnimeSeriesAssetKey
): CharacterPortraitSeriesConfig | null {
  return CHARACTER_PORTRAIT_MANIFEST[key] ?? null;
}

export function listCharacterPortraitSeriesKeys(): AnimeSeriesAssetKey[] {
  return (Object.keys(CHARACTER_PORTRAIT_MANIFEST) as AnimeSeriesAssetKey[]).filter(
    (key) => CHARACTER_PORTRAIT_MANIFEST[key] != null
  );
}
