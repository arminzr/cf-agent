// ─────────────────────────────────────────────────
// Web Search — DuckDuckGo Instant Answer + HTML scrape
// ─────────────────────────────────────────────────

export async function webSearch(query: string): Promise<any> {
  // 1. Try DuckDuckGo Instant Answer API
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const ddgData = await ddgRes.json() as any;

    if (ddgData.AbstractText) {
      return {
        source: 'duckduckgo',
        abstract: ddgData.AbstractText,
        url: ddgData.AbstractURL,
        related: (ddgData.RelatedTopics || []).slice(0, 5).map((t: any) => ({
          text: t.Text,
          url: t.FirstURL,
        })),
      };
    }
  } catch {}

  // 2. Fallback: DuckDuckGo HTML
  try {
    const htmlRes = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const html = await htmlRes.text();
    // Extract results
    const results: { title: string; url: string; snippet: string }[] = [];
    const linkRegex = /<a rel="nofollow" class="result__a" href="([^"]+)">(.*?)<\/a>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < 5) {
      results.push({
        url: match[1],
        title: match[2].replace(/<[^>]*>/g, '').trim(),
        snippet: '',
      });
    }
    return { source: 'duckduckgo-html', results };
  } catch (err: any) {
    return { source: 'error', error: err.message };
  }
}
