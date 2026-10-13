// ─────────────────────────────────────────────────
// Dispatcher — routes outgoing messages to correct platform
// Universal send function: detects platform and calls appropriate adapter
// ─────────────────────────────────────────────────

import type { Env, OutgoingMessage, PlatformChannel } from '../types';
import { telegramSend, telegramSendPhoto, telegramSendAudio } from './telegram';
import { rubikaSend, rubikaSendPhoto } from './rubika';
import { baleSend, baleSendPhoto } from './bale';
import { eitaaSend, eitaaSendPhoto } from './eitaa';

export async function sendResponse(env: Env, msg: OutgoingMessage): Promise<void> {
  const { platform, chatId, text, photoUrl, audioUrl, caption } = msg;

  switch (platform) {
    case 'telegram':
      if (audioUrl) await telegramSendAudio(env, chatId, audioUrl, caption);
      else if (photoUrl) await telegramSendPhoto(env, chatId, photoUrl, caption);
      else await telegramSend(env, chatId, text || '');
      break;

    case 'rubika':
      if (photoUrl) await rubikaSendPhoto(env, chatId, photoUrl, caption);
      else await rubikaSend(env, chatId, text || '');
      break;

    case 'bale':
      if (photoUrl) await baleSendPhoto(env, chatId, photoUrl, caption);
      else await baleSend(env, chatId, text || '');
      break;

    case 'eitaa':
      if (photoUrl) await eitaaSendPhoto(env, chatId, photoUrl, caption);
      else await eitaaSend(env, chatId, text || '');
      break;

    case 'web':
      // Web panel — no action needed (response handled via HTTP)
      break;

    default:
      console.error(`Unknown platform: ${platform}`);
  }
}

// Helper: create outgoing message
export function createOutgoing(platform: PlatformChannel, chatId: string, text: string, extra?: Partial<OutgoingMessage>): OutgoingMessage {
  return {
    platform,
    chatId,
    text,
    photoUrl: extra?.photoUrl,
    audioUrl: extra?.audioUrl,
    caption: extra?.caption,
  };
}
