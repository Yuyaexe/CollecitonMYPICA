import type { AnimeSeedSeries } from "@/features/anime-collection/data/seeds/shared";
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
