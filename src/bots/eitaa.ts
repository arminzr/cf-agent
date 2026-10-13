// ─────────────────────────────────────────────────
// Eitaa Bot Adapter — webhook receiver + sender
// Eitaa API: https://eitaa.com/api/{token}/
// ─────────────────────────────────────────────────

import type { Env, IncomingMessage } from '../types';

export async function eitaaWebhook(request: Request, env: Env): Promise<IncomingMessage | null> {
  const update = await request.json() as any;

  if (update?.message || update?.channel_post) {
    const msg = update.message || update.channel_post;
    return {
      platform: 'eitaa',
      userId: String(msg.from?.id || msg.chat?.id),
      chatId: String(msg.chat?.id || msg.from?.id),
      text: msg.text || msg.caption || '',
      type: msg.text ? 'text' : msg.voice ? 'voice' : msg.photo ? 'photo' : 'unknown',
      fileId: msg.voice?.file_id || msg.photo?.file_id,
      userName: msg.from?.first_name || msg.from?.username || '',
      raw: update,
    };
  }

  return null;
}

export async function eitaaSend(env: Env, chatId: string, text: string): Promise<void> {
  const url = `https://eitaa.com/api/${env.EITAA_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export async function eitaaSendPhoto(env: Env, chatId: string, photoUrl: string, caption?: string): Promise<void> {
  const url = `https://eitaa.com/api/${env.EITAA_BOT_TOKEN}/sendPhoto`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption || '',
    }),
  });
}

export async function eitaaSetWebhook(env: Env, workerUrl: string): Promise<any> {
  const url = `https://eitaa.com/api/${env.EITAA_BOT_TOKEN}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${workerUrl}/webhook/eitaa` }),
  });
  return res.json();
}
