// ─────────────────────────────────────────────────
// Image Generation — Pollinations.ai (free, no API key)
// ─────────────────────────────────────────────────

export async function imageGen(prompt: string): Promise<any> {
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
  return { url: imageUrl, prompt };
}
