// ─────────────────────────────────────────────────
// Weather — Open-Meteo (free, no API key)
// ─────────────────────────────────────────────────

export async function getWeather(city: string, days: number = 3): Promise<any> {
  // 1. Geocode city name
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fa`,
  );
  const geoData = await geoRes.json() as any;

  if (!geoData.results || geoData.results.length === 0) {
    return { error: `شهر "${city}" پیدا نشد` };
  }

  const loc = geoData.results[0];
  const lat = loc.latitude;
  const lon = loc.longitude;

  // 2. Get weather forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&timezone=auto&forecast_days=${Math.min(days, 7)}`
  );
  const weatherData = await weatherRes.json() as any;

  // 3. Map weather codes
  const weatherCodes: Record<number, string> = {
    0: '☀️ آفتابی',
    1: '🌤️ نیمه ابری',
    2: '⛅ ابری',
    3: '☁️ کاملا ابری',
    45: '🌫️ مه',
    48: '🌫️ مه یخ‌زده',
    51: '🌦️ باران سبک',
    53: '🌧️ باران متوسط',
    55: '🌧️ باران شدید',
    61: '⛈️ رعد و برق',
    71: '🌨️ برف سبک',
    73: '❄️ برف متوسط',
    75: '❄️ برف شدید',
    80: '🌧️ رگبار',
    95: '⛈️ رعد و برق شدید',
  };

  const forecast = weatherData.daily?.time?.map((date: string, i: number) => ({
    date,
    maxTemp: weatherData.daily.temperature_2m_max[i],
    minTemp: weatherData.daily.temperature_2m_min[i],
    precipitation: weatherData.daily.precipitation_sum[i],
    weather: weatherCodes[weatherData.daily.weathercode[i]] || 'نامشخص',
    windSpeed: weatherData.daily.windspeed_10m_max[i],
  })) || [];

  return {
    location: loc.name + (loc.country ? ', ' + loc.country : ''),
    forecast,
    timezone: weatherData.timezone,
  };
}
