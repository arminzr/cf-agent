// ─────────────────────────────────────────────────
// Crypto — CoinGecko (free, 30 req/min)
// ─────────────────────────────────────────────────

export async function getCrypto(coin: string = 'bitcoin'): Promise<any> {
  const coinId = coin.toLowerCase().replace(/\s/g, '-');

  // 1. Price
  const priceRes = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,eur&include_24hr_change=true&include_market_cap=true`,
    { headers: { 'accept': 'application/json' } }
  );

  if (!priceRes.ok) {
    // Try search
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(coin)}`
    );
    const searchData = await searchRes.json() as any;
    if (searchData.coins && searchData.coins.length > 0) {
      const first = searchData.coins[0];
      // Retry with correct ID
      return getCrypto(first.id);
    }
    return { error: `ارز "${coin}" پیدا نشد` };
  }

  const priceData = await priceRes.json() as any;
  const coinData = priceData[coinId];

  if (!coinData) {
    return { error: `داده‌ای برای "${coin}" موجود نیست` };
  }

  return {
    coin: coinId,
    price_usd: coinData.usd,
    price_eur: coinData.eur,
    change_24h: coinData.usd_24h_change?.toFixed(2) + '%',
    market_cap_usd: coinData.usd_market_cap,
  };
}
