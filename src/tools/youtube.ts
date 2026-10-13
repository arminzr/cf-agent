// ─────────────────────────────────────────────────
// YouTube Transcript — fetches captions via public API
// ─────────────────────────────────────────────────

export async function youtubeTranscript(videoId: string): Promise<any> {
  // Try the public transcript API
  try {
    const res = await fetch(
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const xml = await res.text();
      if (xml && xml.length > 0) {
        // Parse XML captions
        const lines: { start: string; text: string }[] = [];
        const regex = /<text start="([\d.]+)"[^>]*>(.*?)<\/text>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
          lines.push({
            start: match[1],
            text: match[2]
              .replace(/&/g, '&')
              .replace(/</g, '<')
              .replace(/>/g, '>')
              .replace(/"/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&nbsp;/g, ' '),
          });
        }
        if (lines.length > 0) {
          return { videoId, lines, totalCaptions: lines.length };
        }
      }
    }
  } catch {}

  // Fallback: try a third-party transcript service
  try {
    const res = await fetch(
      `https://yt.lemnoslife.com/videos?part=captionTracks&id=${videoId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await res.json() as any;
    const tracks = data?.items?.[0]?.captionTracks || [];
    if (tracks.length > 0) {
      const track = tracks.find((t: any) => t.languageCode === 'en') || tracks[0];
      const captionRes = await fetch(
        `https://www.youtube.com/api/timedtext?lang=${track.languageCode}&v=${videoId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const xml = await captionRes.text();
      const lines: string[] = [];
      const regex = /<text[^>]*>(.*?)<\/text>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        lines.push(match[1]
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' '));
      }
      return { videoId, lines, totalCaptions: lines.length };
    }
  } catch {}

  return { error: `برای ویدیو ${videoId} زیرنویس پیدا نشد` };
}
