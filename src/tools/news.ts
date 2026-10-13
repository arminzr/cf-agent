// ─────────────────────────────────────────────────
// News — Iranian RSS feeds (free, no API key)
// ─────────────────────────────────────────────────

const FEEDS: Record<string, { name: string; url: string }[]> = {
  all: [
    { name: 'ISNA', url: 'https://www.isna.ir/rss' },
    { name: 'IRNA', url: 'https://www.irna.ir/rss' },
    { name: 'Mehr', url: 'https://www.mehrnews.com/rss' },
    { name: 'Tasnim', url: 'https://www.tasnimnews.com/fa/rss/feed/0' },
  ],
  politics: [{ name: 'Tasnim', url: 'https://www.tasnimnews.com/fa/rss/feed/1' }],
  economy: [{ name: 'ISNA', url: 'https://www.isna.ir/rss/2' }],
  sports: [{ name: 'ISNA', url: 'https://www.isna.ir/rss/3' }],
  tech: [
    { name: 'ISNA', url: 'https://www.isna.ir/rss/8' },
    { name: 'Mehr', url: 'https://www.mehrnews.com/rss/6' },
  ],
};

function parseRSS(xml: string, limit: number = 5): { title: string; link: string; date: string }[] {
  const items: { title: string; link: string; date: string }[] = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[0];
    const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const date = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    items.push({ title, link, date });
  }
  return items;
}

export async function getNews(category: string = 'all'): Promise<any> {
  const feeds = FEEDS[category] || FEEDS.all;
  const allNews: { source: string; items: { title: string; link: string; date: string }[] }[] = [];

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const xml = await res.text();
      const items = parseRSS(xml, 3);
      return { source: feed.name, items };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') allNews.push(r.value);
  }

  if (allNews.length === 0) {
    return { error: 'هیچ خبری دریافت نشد' };
  }

  return { category, feeds: allNews };
}
