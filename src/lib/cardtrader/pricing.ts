import type { CardCondition, CardLanguage, Currency } from "@/types/tcg";
import { isCardTraderConfigured, cardTraderFetch } from "./client";
import { buildCardTraderUrl, resolveBlueprintId, getBlueprintImageUrl } from "./catalog";
import { centsToAmount, convertToCurrency } from "./convert-currency";
import type { CardPriceInput, CardTraderPriceResult, CardTraderProduct } from "./types";

const CONDITION_TO_CARDTRADER: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Slightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Poor",
};

const LANGUAGE_TO_CARDTRADER: Record<CardLanguage, string[]> = {
  EN: ["en", "english"],
  JP: ["jp", "ja", "japanese"],
  PT: ["pt", "portuguese"],
  DE: ["de", "german"],
  FR: ["fr", "french"],
  ES: ["es", "spanish"],
  IT: ["it", "italian"],
  KO: ["ko", "korean"],
  ZH: ["zh", "chinese"],
};

const priceCache = new Map<string, { result: CardTraderPriceResult; expires: number }>();
const PRICE_TTL_MS = 60 * 60 * 1000;

function productCents(product: CardTraderProduct): number | null {
  if (product.price?.cents != null) return product.price.cents;
  if (product.price_cents != null) return product.price_cents;
  return null;
}

function productCurrency(product: CardTraderProduct): string {
  return product.price?.currency ?? product.price_currency ?? "USD";
}

function matchesCondition(product: CardTraderProduct, condition: CardCondition): boolean {
  const wanted = CONDITION_TO_CARDTRADER[condition].toLowerCase();
  const props = product.properties_hash ?? {};
  const values = Object.values(props).map((v) => v.toLowerCase());
  if (values.some((v) => v.includes(wanted))) return true;
  if (condition === "NM") {
    return values.length === 0 || values.some((v) => v.includes("near mint"));
  }
  return false;
}

function matchesLanguage(product: CardTraderProduct, language: CardLanguage): boolean {
  const aliases = LANGUAGE_TO_CARDTRADER[language];
  const props = product.properties_hash ?? {};
  const joined = Object.values(props).join(" ").toLowerCase();
  return aliases.some((alias) => joined.includes(alias));
}

function filterProducts(
  products: CardTraderProduct[],
  input: CardPriceInput
): CardTraderProduct[] {
  return products.filter((product) => {
    if (product.on_vacation) return false;
    if ((product.quantity ?? 0) <= 0) return false;
    if (productCents(product) == null) return false;
    if (input.condition && !matchesCondition(product, input.condition)) return false;
    if (input.language && !matchesLanguage(product, input.language)) return false;
    if (input.isFoil) {
      const props = product.properties_hash ?? {};
      const joined = Object.values(props).join(" ").toLowerCase();
      if (!joined.includes("foil")) return false;
    }
    return true;
  });
}

export async function getCardTraderPrice(
  input: CardPriceInput
): Promise<CardTraderPriceResult | null> {
  if (!isCardTraderConfigured()) return null;

  const cacheKey = JSON.stringify(input);
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.result;

  const blueprintId = await resolveBlueprintId(input);
  if (!blueprintId) return null;

  const response = await cardTraderFetch<Record<string, CardTraderProduct[]>>(
    "/marketplace/products",
    { blueprint_id: String(blueprintId) }
  );

  const products =
    response[String(blueprintId)] ??
    Object.values(response).find((list) => Array.isArray(list) && list.length > 0) ??
    [];

  const filtered = filterProducts(products, input);
  const pool = filtered.length > 0 ? filtered : products.filter((p) => productCents(p) != null);

  const cheapest = [...pool].sort((a, b) => (productCents(a) ?? Infinity) - (productCents(b) ?? 0))[0];
  if (!cheapest) return null;

  const cents = productCents(cheapest);
  if (cents == null) return null;

  const result: CardTraderPriceResult = {
    price: centsToAmount(cents),
    currency: productCurrency(cheapest),
    blueprintId,
    url: buildCardTraderUrl(input.gameSlug, blueprintId),
    listingCount: pool.length,
    imageUrl: getBlueprintImageUrl(blueprintId),
  };

  priceCache.set(cacheKey, { result, expires: Date.now() + PRICE_TTL_MS });
  return result;
}

export async function getCardTraderPriceForProfile(
  input: CardPriceInput,
  profileCurrency: Currency
): Promise<{
  price: number;
  currency: Currency;
  blueprintId: number;
  url: string;
  imageUrl: string | null;
} | null> {
  const quote = await getCardTraderPrice(input);
  if (!quote) return null;

  return {
    price: convertToCurrency(quote.price, quote.currency, profileCurrency),
    currency: profileCurrency,
    blueprintId: quote.blueprintId,
    url: quote.url,
    imageUrl: quote.imageUrl ?? null,
  };
}

export async function resolveBestMarketPrice(
  input: CardPriceInput,
  fallbackPrice: number | null | undefined,
  profileCurrency: Currency
): Promise<number | null> {
  const cardTrader = await getCardTraderPriceForProfile(input, profileCurrency);
  if (cardTrader?.price != null) return cardTrader.price;
  return fallbackPrice ?? null;
}
