// ─────────────────────────────────────────────────
// Maps & Geolocation — OpenStreetMap Nominatim (free)
// ─────────────────────────────────────────────────

export async function getMaps(query: string): Promise<any> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=fa`,
    { headers: { 'User-Agent': 'cf-agent/1.0' } }
  );

  if (!res.ok) {
    return { error: `جستجوی مکان ناموفق: ${res.status}` };
  }

  const data = await res.json() as any[];

  if (!data || data.length === 0) {
    return { error: `مکان "${query}" پیدا نشد` };
  }

  const results = data.map((item: any) => ({
    name: item.display_name,
    lat: item.lat,
    lon: item.lon,
    type: item.type,
    category: item.category,
    address: item.address,
    osmUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}&zoom=15`,
  }));

  return { query, results };
}
