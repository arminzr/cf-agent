// ─────────────────────────────────────────────────
// Cloudflare Worker Agent — Main Entrypoint
// Multi-messenger: Telegram, Rubika, Bale, Eitaa
// Agent brain: Durable Objects + Tool Router + LLM Gateway
// ─────────────────────────────────────────────────

import { AgentDO } from './agent';
import type { Env, IncomingMessage, OutgoingMessage, PlatformChannel, ProviderConfig } from './types';
import { LLMRouter } from './gateway/router';
import { ToolRouter } from './tools/router';

// Bot adapters
import { telegramWebhook, telegramSetWebhook } from './bots/telegram';
import { rubikaWebhook, rubikaSetWebhook } from './bots/rubika';
import { baleWebhook, baleSetWebhook } from './bots/bale';
import { eitaaWebhook, eitaaSetWebhook } from './bots/eitaa';
import { sendResponse } from './bots/dispatcher';

// ─── Durable Object Export (required for wrangler) ───
export { AgentDO };

// ─── Worker Entrypoint ───

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      // ─── Health check ───
      if (url.pathname === '/' || url.pathname === '/health') {
        return json({
          status: 'ok',
          agent: env.AGENT_NAME || 'Nahan',
          version: env.VERSION || '1.0.0',
          uptime: Date.now(),
        });
      }

      // ─── Webhook routes ───

      if (url.pathname.startsWith('/webhook/telegram') && method === 'POST') {
        const incoming = await telegramWebhook(request, env);
        if (incoming) {
          await routeToAgent(env, incoming);
        }
        return new Response('ok', { status: 200 });
      }

      if (url.pathname.startsWith('/webhook/rubika') && method === 'POST') {
        const incoming = await rubikaWebhook(request, env);
        if (incoming) {
          await routeToAgent(env, incoming);
        }
        return new Response('ok', { status: 200 });
      }

      if (url.pathname.startsWith('/webhook/bale') && method === 'POST') {
        const incoming = await baleWebhook(request, env);
        if (incoming) {
          await routeToAgent(env, incoming);
        }
        return new Response('ok', { status: 200 });
      }

      if (url.pathname.startsWith('/webhook/eitaa') && method === 'POST') {
        const incoming = await eitaaWebhook(request, env);
        if (incoming) {
          await routeToAgent(env, incoming);
        }
        return new Response('ok', { status: 200 });
      }

      // ─── Setup routes (get webhook URLs) ───

      if (url.pathname === '/setup/telegram' && method === 'GET') {
        const workerUrl = `https://${url.hostname}`;
        const result = await telegramSetWebhook(env, workerUrl);
        return json(result);
      }

      if (url.pathname === '/setup/rubika' && method === 'GET') {
        const workerUrl = `https://${url.hostname}`;
        const result = await rubikaSetWebhook(env, workerUrl);
        return json(result);
      }

      if (url.pathname === '/setup/bale' && method === 'GET') {
        const workerUrl = `https://${url.hostname}`;
        const result = await baleSetWebhook(env, workerUrl);
        return json(result);
      }

      if (url.pathname === '/setup/eitaa' && method === 'GET') {
        const workerUrl = `https://${url.hostname}`;
        const result = await eitaaSetWebhook(env, workerUrl);
        return json(result);
      }

      // ─── Agent API (direct interaction) ───

      if (url.pathname === '/api/chat' && method === 'POST') {
        const body = await request.json() as any;
        const incoming: IncomingMessage = {
          platform: 'web',
          userId: body.userId || 'web-user',
          chatId: body.userId || 'web-user',
          text: body.text || '',
          type: 'text',
          raw: body,
        };
        const result = await routeToAgent(env, incoming);
        return json(result);
      }

      // ─── Provider management ───

      if (url.pathname === '/api/providers' && method === 'GET') {
        const providers = await env.CONFIG.get('custom_providers');
        return json({ providers: providers ? JSON.parse(providers) : [] });
      }

      if (url.pathname === '/api/providers' && method === 'POST') {
        const body = await request.json() as ProviderConfig;
        const existing = await env.CONFIG.get('custom_providers');
        const providers: ProviderConfig[] = existing ? JSON.parse(existing) : [];
        providers.push(body);
        await env.CONFIG.put('custom_providers', JSON.stringify(providers));
        return json({ success: true, provider: body });
      }

      // ─── Tools listing ───

      if (url.pathname === '/api/tools' && method === 'GET') {
        return json({ tools: ToolRouter.getAllTools() });
      }

      // ─── Tool execution ───

      if (url.pathname === '/api/tools/execute' && method === 'POST') {
        const body = await request.json() as any;
        const result = await ToolRouter.execute(env, body.name, body.args || {});
        return json(result);
      }

      // ─── File serving (R2) ───

      if (url.pathname.startsWith('/files/') && method === 'GET') {
        const key = url.pathname.slice(8);
        const object = await env.FILES.get(key);
        if (!object) {
          return new Response('Not found', { status: 404 });
        }
        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=3600');
        return new Response(object.body, { headers });
      }

      // ─── 404 ───

      return new Response('Not found', { status: 404 });

    } catch (err: any) {
      console.error('Worker error:', err);
      return json({ error: err.message || 'Internal error' }, 500);
    }
  },

  // ─── Cron Triggers ───

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Health check cron — can be used for proactive agent behavior
    console.log(`[${new Date().toISOString()}] Cron triggered: ${event.cron}`);

    if (event.cron === '0 * * * *') {
      // Hourly health check
      console.log('Hourly health check — agent alive');
    }

    if (event.cron === '*/30 * * * *') {
      // Every 30 min — check for scheduled notifications
      // TODO: implement notification checking from D1
      console.log('30min tick — checking notifications');
    }
  },
};

// ─── Helper: Route message to Durable Object ───

async function routeToAgent(env: Env, incoming: IncomingMessage): Promise<{ success: boolean; response?: string; error?: string }> {
  // Each user gets their own Durable Object instance
  const doId = env.AGENT.idFromName(`${incoming.platform}:${incoming.userId}`);
  const stub = env.AGENT.get(doId);

  // Call the agent's handleMessage method via fetch
  const res = await stub.fetch('https://agent/handle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incoming),
  });

  if (!res.ok) {
    return { success: false, error: `Agent error: ${res.status}` };
  }

  return res.json();
}

// ─── JSON helper ───

function json(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
