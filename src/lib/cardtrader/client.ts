const BASE_URL = "https://api.cardtrader.com/api/v2";

export function isCardTraderConfigured(): boolean {
  return Boolean(process.env.CARDTRADER_API_TOKEN?.trim());
}

/** CardTrader wraps list endpoints as `{ array: T[] }` instead of a raw array. */
export function unwrapCardTraderList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "array" in data &&
    Array.isArray((data as { array: unknown }).array)
  ) {
    return (data as { array: T[] }).array;
  }
  return [];
}

export async function cardTraderFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const token = process.env.CARDTRADER_API_TOKEN?.trim();
  if (!token) {
    throw new Error("CARDTRADER_API_TOKEN is not configured");
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CardTrader API error (${res.status})`);
  }

  return res.json() as Promise<T>;
}
