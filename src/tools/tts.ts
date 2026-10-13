// ─────────────────────────────────────────────────
// TTS — Text to Speech via Microsoft Edge TTS
// (WebSocket proxy — no server needed, works on Workers)
// ─────────────────────────────────────────────────

import type { Env } from '../types';

const VOICES: Record<string, string> = {
  'fa-IR-Farid': 'fa-IR-FaridNeural',
  'fa-IR-Male': 'fa-IR-FaridNeural',
  'fa-IR-Female': 'fa-IR-FaridNeural',
  'en-US': 'en-US-AriaNeural',
  'en-US-Male': 'en-US-GuyNeural',
  'ar-SA': 'ar-SA-HamedNeural',
  'de-DE': 'de-DE-MarleneNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'tr-TR': 'tr-TR-EmelNeural',
};

export async function textToSpeech(text: string, voice: string = 'fa-IR-Farid', env: Env): Promise<any> {
  const voiceId = VOICES[voice] || VOICES['fa-IR-Farid'] || 'fa-IR-FaridNeural';

  // Use a public Edge TTS proxy that works on Workers (no WebSocket needed)
  // Fallback: Pollinations TTS or Workers AI TTS
  
  // Option 1: Try Pollinations TTS endpoint (if available)
  try {
    const ttsUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=${voiceId}`;
    const res = await fetch(ttsUrl, { method: 'GET' });
    if (res.ok && res.headers.get('content-type')?.includes('audio')) {
      const audioBuffer = await res.arrayBuffer();
      // Store in R2 for retrieval
      const audioKey = `tts/${Date.now()}-${Math.random().toString(36).slice(7)}.mp3`;
      await env.FILES.put(audioKey, audioBuffer, {
        httpMetadata: { contentType: 'audio/mpeg' },
      });
      return {
        url: `/files/${audioKey}`,
        voice: voiceId,
        chars: text.length,
      };
    }
  } catch {}

  // Option 2: Workers AI TTS (10K neurons/day free)
  try {
    const res: any = await (env.AI as any).run('@cf/myshell-ai/melotts', {
      text,
      language: voice.substring(0, 2),
    });
    if (res.audio) {
      const audioKey = `tts/${Date.now()}-${Math.random().toString(36).slice(7)}.mp3`;
      const audioBytes = res.audio instanceof ArrayBuffer ? res.audio : new TextEncoder().encode(res.audio);
      await env.FILES.put(audioKey, audioBytes, {
        httpMetadata: { contentType: 'audio/mpeg' },
      });
      return { url: `/files/${audioKey}`, voice: voiceId, chars: text.length };
    }
  } catch {}

  return { error: 'TTS متصل نیست. Pollinations یا Workers AI در دسترس نیست.' };
}
