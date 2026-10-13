// ─────────────────────────────────────────────────
// Bale Bot Adapter — webhook receiver + sender
// Bale API: https://api.bale.ai/bot{token}/
// ─────────────────────────────────────────────────

import type { Env, IncomingMessage } from '../types';

export async function baleWebhook(request: Request, env: Env): Promise<IncomingMessage | null> {
  const update = await request.json() as any;

  if (update?.message) {
    const msg = update.message;
    return {
      platform: 'bale',
      userId: String(msg.from?.id),
      chatId: String(msg.chat?.id || msg.from?.id),
      text: msg.text || '',
      type: msg.text ? 'text' : msg.voice ? 'voice' : msg.photo ? 'photo' : 'unknown',
      fileId: msg.voice?.file_id || msg.photo?.[0]?.file_id,
      userName: msg.from?.first_name || msg.from?.username || '',
      raw: update,
    };
  }

  return null;
}

export async function baleSend(env: Env, chatId: string, text: string): Promise<void> {
  const url = `https://api.bale.ai/bot${env.BALE_BOT_TOKEN}/sendMessage`;
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

export async function baleSendPhoto(env: Env, chatId: string, photoUrl: string, caption?: string): Promise<void> {
  const url = `https://api.bale.ai/bot${env.BALE_BOT_TOKEN}/sendPhoto`;
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

export async function baleSetWebhook(env: Env, workerUrl: string): Promise<any> {
  const url = `https://api.bale.ai/bot${env.BALE_BOT_TOKEN}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${workerUrl}/webhook/bale` }),
  });
  return res.json();
}
