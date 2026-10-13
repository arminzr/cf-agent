// ─────────────────────────────────────────────────
// OCR — Image to Text via OCR.space (free, 25K req/month)
// + Workers AI LLaVA fallback (image captioning)
// ─────────────────────────────────────────────────

import type { Env } from '../types';

export async function ocrImage(imageUrl: string, env: Env): Promise<any> {
  // Option 1: OCR.space API (25K/month free, no key for basic)
  try {
    const formData = new FormData();
    formData.append('url', imageUrl);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 = better accuracy

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json() as any;
      if (data?.ParsedResults?.[0]?.ParsedText) {
        const text = data.ParsedResults[0].ParsedText.trim();
        if (text.length > 0) {
          return {
            text,
            source: 'ocr.space',
            language: data.ParsedResults[0]?.Language || 'eng',
          };
        }
      }
    }
  } catch {}

  // Option 2: Workers AI LLaVA (image captioning, not full OCR)
  try {
    const imageRes = await fetch(imageUrl);
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
    const result = await (env.AI as any).run(
      '@cf/llava-hf/llava-1.5-2b-hf',
      { image: imageBytes, prompt: 'Extract all text from this image. Return only the text content.' }
    );
    const response = result as any;
    const text = response?.response || response?.answer || '';
    if (text) {
      return {
        text,
        source: 'workers-ai-llava',
        note: 'Image captioning (not full OCR)',
      };
    }
  } catch {}

  return { error: 'OCR failed. Both OCR.space and Workers AI unavailable.' };
}
