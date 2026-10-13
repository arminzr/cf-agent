// ─────────────────────────────────────────────────
// Rubika Bot Adapter — webhook receiver + sender
// Rubika API: https:// Rubika API: https://rubika.com/bot/api
// ─────────────────────────────────────────────────

import type { Env, IncomingMessage } from '../types';

export async function rubikaWebhook(request: Request, env: Env): Promise<IncomingMessage | null> {
  const update = await request.json() as any;

  if (update?.message || update?.object) {
    const msg = update.message || update.object;
    return {
      platform: 'rubika',
      userId: String(msg.from?.user_id || msg.chat_id),
      chatId: String(msg.chat_id || msg.from?.chat_id),
      text: msg.text || msg.caption || '',
      type: msg.text ? 'text' : msg.voice ?
        'voice' : msg.photo ? 'photo' : 'unknown',
      fileId: msg.voice?.file_id || msg.photo?.file_id,
      userName: msg.from?.first_name || '',
      raw: update,
    };
  }

  return null;
}

export async function rubikaSend(env: Env, chatId: string, text: string): Promise<void> {
  const url = `https://bot.rubika.com/api/${env.RUBIKA_BOT_TOKEN}/sendMessage`;
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

export async function rubikaSendPhoto(env: Env, chatId: string, photoUrl: string, caption?: string): Promise<void> {
  const url = `https://bot.rubika.com/api/${env.RUBIKA_BOT_TOKEN}/sendPhoto`;
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

export async function rubikaSetWebhook(env: Env, workerUrl: string): Promise<any> {
  const url = `https://bot.rubika.com/api/${env.RUBIKA_BOT_TOKEN}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${workerUrl}/webhook/rubika` }),
  });
  return res.json();
}
