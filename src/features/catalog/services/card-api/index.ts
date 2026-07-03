import type { CardApiAdapter } from "./types";
import { yugiohAdapter } from "./yugioh.adapter";
import { pokemonAdapter } from "./pokemon.adapter";
import { digimonAdapter } from "./digimon.adapter";

const stubAdapter = (slug: string): CardApiAdapter => ({
  gameSlug: slug,
  async search() {
    return [];
  },
  async getById() {
    return null;
  },
});

const adapters: Record<string, CardApiAdapter> = {
  yugioh: yugiohAdapter,
  pokemon: pokemonAdapter,
  digimon: digimonAdapter,
  onepiece: stubAdapter("onepiece"),
  lorcana: stubAdapter("lorcana"),
  magic: stubAdapter("magic"),
};

const SUPPORTED_GAMES = ["yugioh", "pokemon", "digimon"] as const;

export function getCardAdapter(gameSlug: string): CardApiAdapter | null {
  return adapters[gameSlug] ?? null;
}

export function isApiSupported(gameSlug: string): boolean {
  return SUPPORTED_GAMES.includes(gameSlug as (typeof SUPPORTED_GAMES)[number]);
}

export { yugiohAdapter, pokemonAdapter, digimonAdapter };
