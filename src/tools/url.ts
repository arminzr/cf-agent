// ─────────────────────────────────────────────────
// URL Shortener — is.gd (free, no API key)
// ─────────────────────────────────────────────────

export async function urlShorten(url: string): Promise<any> {
  const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`);
  const data = await res.json() as any;
  
  if (data.shorturl) {
    return { short_url: data.shorturl, original_url: url };
  }
  return { error: data.errormessage || 'URL shortening failed' };
}
