const BASE_URL = "https://api.cardtrader.com/api/v2";

export function isCardTraderConfigured(): boolean {
  return Boolean(process.env.CARDTRADER_API_TOKEN?.trim());
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
