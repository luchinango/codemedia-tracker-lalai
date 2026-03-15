/**
 * Exchange rate utility — fetches USD/BOB rate.
 * Uses Binance P2P median as reference, with fallback to a fixed rate.
 * Cached for 1 hour to avoid excessive API calls.
 */

let cachedRate: { value: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 6.96; // Conservative fallback BOB/USD

export async function getUsdToBob(): Promise<number> {
  // Return cached value if fresh
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL_MS) {
    return cachedRate.value;
  }

  try {
    // Binance P2P API — get median USDT sell price in BOB
    const response = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiat: "BOB",
        page: 1,
        rows: 10,
        tradeType: "SELL",
        asset: "USDT",
        payTypes: [],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error("Binance API error");

    const json = await response.json();
    const ads = json?.data ?? [];

    if (ads.length === 0) throw new Error("No ads found");

    // Get median price from top 10 ads
    const prices = ads
      .map((ad: { adv?: { price?: string } }) => parseFloat(ad.adv?.price ?? "0"))
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b);

    const median = prices.length > 0
      ? prices[Math.floor(prices.length / 2)]
      : FALLBACK_RATE;

    cachedRate = { value: median, timestamp: Date.now() };
    return median;
  } catch {
    // On any error, use fallback or previous cache
    if (cachedRate) return cachedRate.value;
    return FALLBACK_RATE;
  }
}

/** Convert USD to BOB */
export function usdToBob(usd: number, rate: number): number {
  return usd * rate;
}

/** Convert BOB to USD */
export function bobToUsd(bob: number, rate: number): number {
  return rate > 0 ? bob / rate : 0;
}
