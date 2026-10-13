// ─────────────────────────────────────────────────
// Dollar/Toman Rate — CoinGecko (USD) + TGju (Toman/Gold)
// ─────────────────────────────────────────────────

export async function getDollarRate(): Promise<any> {
  const result: any = {};

  // 1. USD global price via CoinGecko (relative to EUR for reference)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=try,eur'
    );
    if (res.ok) {
      const data = await res.json() as any;
      result.usdt_try = data?.tether?.try;
      result.usdt_eur = data?.tether?.eur;
    }
  } catch {}

  // 2. Toman rate via TGju API (دلار آزاد)
  try {
    const res = await fetch(
      'https://api.tgju.online/v1/market/price/usd',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      if (data?.data?.price) {
        result.dollar_toman = parseInt(data.data.price.replace(/,/g, ''));
        result.dollar_toman_formatted = data.data.price;
      }
    }
  } catch {}

  // 3. Gold prices via TGju
  try {
    const res = await fetch(
      'https://api.tgju.online/v1/market/price/geram18',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      if (data?.data?.price) {
        result.gold_gram_toman = parseInt(data.data.price.replace(/,/g, ''));
        result.gold_gram_toman_formatted = data.data.price;
      }
    }
  } catch {}

  if (Object.keys(result).length === 0) {
    return { error: 'دریافت نرخ دلار/طلا ناموفق بود' };
  }

  return result;
}
