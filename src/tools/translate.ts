// ─────────────────────────────────────────────────
// Translation — Google Translate (free, unofficial)
// ─────────────────────────────────────────────────

export async function translateText(text: string, from: string = 'auto', to: string = 'fa'): Promise<any> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) {
    return { error: `Translation failed: ${res.status}` };
  }

  const data = await res.json() as any;
  
  // Response format: [[["translated","original",...]], ...]
  const translated = (data[0] || []).map((seg: any) => seg[0] || '').join('');
  const detectedFrom = data[2] || from;

  return {
    translated,
    from: detectedFrom,
    to,
    original: text,
  };
}
