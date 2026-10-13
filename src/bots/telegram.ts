// ─────────────────────────────────────────────────
// Telegram Bot Adapter — webhook receiver + sender
// ─────────────────────────────────────────────────

import type { Env, IncomingMessage } from '../types';

export async function telegramWebhook(request: Request, env: Env): Promise<IncomingMessage | null> {
  const update = await request.json() as any;

  // Message update
  if (update.message) {
    const msg = update.message;
    const incoming: IncomingMessage = {
      platform: 'telegram',
      userId: String(msg.from.id),
      chatId: String(msg.chat.id),
      text: msg.text || '',
      type: msg.text ? 'text' : msg.voice ? 'voice' : msg.photo ? 'photo' : 'unknown',
      fileId: msg.voice?.file_id || msg.photo?.[0]?.file_id,
      userName: msg.from.first_name || msg.from.username || '',
      raw: update,
    };
    return incoming;
  }

  // Callback query (inline button)
  if (update.callback_query) {
    const cq = update.callback_query;
    return {
      platform: 'telegram',
      userId: String(cq.from.id),
      chatId: String(cq.message?.chat?.id || cq.from.id),
      text: cq.data || '',
      type: 'callback',
      userName: cq.from.first_name || '',
      raw: update,
    };
  }

  return null;
}

export async function telegramSend(env: Env, chatId: string, text: string, extra?: any): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra,
    }),
  });
}

export async function telegramSendPhoto(env: Env, chatId: string, photoUrl: string, caption?: string): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
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

export async function telegramSendAudio(env: Env, chatId: string, audioUrl: string, caption?: string): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendAudio`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      audio: audioUrl,
      caption: caption || '',
    }),
  });
}

export async function telegramSetWebhook(env: Env, workerUrl: string): Promise<any> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${workerUrl}/webhook/telegram` }),
  });
  return res.json();
}
