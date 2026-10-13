// ─────────────────────────────────────────────────
// STT — Speech to Text via Groq Whisper (free, 25 req/day)
// Supports: 99 languages including Persian (Farsi)
// Model: whisper-large-v3-turbo (247x realtime)
// ─────────────────────────────────────────────────

import type { Env } from '../types';

export async function speechToText(audioUrl: string, language: string = 'fa', env: Env): Promise<any> {
  if (!env.GROQ_API_KEY) {
    return { error: 'GROQ_API_KEY not configured. Set it via wrangler secret put.' };
  }

  try {
    // 1. Fetch audio file
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return { error: `Failed to fetch audio: ${audioRes.status}` };
    }
    const audioBytes = await audioRes.arrayBuffer();

    // 2. Send to Groq Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioBytes]), 'audio.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', language);
    formData.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Groq Whisper failed (${res.status}): ${errText}` };
    }

    const data = await res.json() as any;
    return {
      text: data.text || '',
      language: data.language || language,
      duration: data.duration || 0,
      segments: data.segments?.length || 0,
    };
  } catch (err: any) {
    return { error: `STT error: ${err.message}` };
  }
}
