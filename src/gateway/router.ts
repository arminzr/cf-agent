// ─────────────────────────────────────────────────
// LLM Router — Multi-provider with API key rotation + fallback
// Supports: Groq, Gemini, Cerebras, OpenAI-compatible custom URLs
// ─────────────────────────────────────────────────

import type { Env, LLMRequest, LLMResponse, ProviderConfig, ChatMessage, ToolCall } from '../types';

// ─── Default Providers (built-in, free) ───

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'groq',
    name: 'Groq',
    type: 'groq',
    base_url: 'https://api.groq.com/openai/v1',
    api_keys: [], // filled from env
    rate_limit: { rpm: 30, rpd: 14400 },
    models: [
      { name: 'Llama 3.3 70B', model: 'llama-3.3-70b-versatile' },
      { name: 'Llama 4 Scout', model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
      { name: 'Qwen 3 32B', model: 'qwen/qwen3-32b' },
      { name: 'DeepSeek R1', model: 'deepseek-coder/deepseek-r1-distill-qwen-32b' },
    ],
    priority: 1,
    fallback_chain: ['gemini'],
    enabled: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    base_url: 'https://generativelanguage.googleapis.com/v1beta',
    api_keys: [],
    rate_limit: { rpm: 15, rpd: 1500 },
    models: [
      { name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash' },
      { name: 'Gemini 2.0 Flash-Lite', model: 'gemini-2.0-flash-lite' },
    ],
    priority: 2,
    fallback_chain: ['workers-ai'],
    enabled: true,
  },
  {
    id: 'workers-ai',
    name: 'Cloudflare Workers AI',
    type: 'custom',
    base_url: 'internal',
    api_keys: ['internal'],
    rate_limit: { rpm: 999999, rpd: 999999 },
    models: [
      { name: 'Llama 3.2', model: '@cf/meta/llama-3.2-3b-instruct' },
      { name: 'Mistral 7B', model: '@cf/mistral/mistral-7b-instruct' },
    ],
    priority: 3,
    fallback_chain: [],
    enabled: true,
  },
];

// ─── Rate Limit State ───

const rateState: Map<string, { count: number; windowStart: number }> = new Map();

function canProceed(providerId: string, rpm: number): boolean {
  const now = Date.now();
  const state = rateState.get(providerId);
  if (!state || (now - state.windowStart) > 60000) {
    rateState.set(providerId, { count: 0, windowStart: now });
    return true;
  }
  return state.count < rpm;
}

function recordRequest(providerId: string): void {
  const now = Date.now();
  const state = rateState.get(providerId);
  if (!state || (now - state.windowStart) > 60000) {
    rateState.set(providerId, { count: 1, windowStart: now });
  } else {
    state.count++;
  }
}

// ─── Key Rotation ───

const keyIndex: Map<string, number> = new Map();

function getNextKey(providerId: string, keys: string[]): string {
  const idx = keyIndex.get(providerId) || 0;
  const key = keys[idx % keys.length];
  keyIndex.set(providerId, (idx + 1) % keys.length);
  return key;
}

// ─── Load Providers from KV (with defaults) ───

async function getProviders(env: Env): Promise<ProviderConfig[]> {
  // Start with defaults
  const providers = [...DEFAULT_PROVIDERS];

  // Fill API keys from env secrets
  providers[0].api_keys = [env.GROQ_API_KEY].filter(Boolean);
  providers[1].api_keys = [env.GEMINI_API_KEY].filter(Boolean);

  // Load custom providers from KV
  try {
    const custom = await env.CONFIG.get('custom_providers');
    if (custom) {
      const customList = JSON.parse(custom) as ProviderConfig[];
      providers.push(...customList.filter(p => p.enabled));
    }
  } catch {}

  return providers.filter(p => p.enabled && p.api_keys.length > 0);
}

// ─── Call Provider ───

async function callOpenAICompatible(
  baseUrl: string, apiKey: string, requestBody: any, providerId: string
): Promise<LLMResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...requestBody,
      stream: false,
    }),
  });

  if (res.status === 429) {
    throw new Error(`Rate limited: ${providerId}`);
  }
  if (res.status === 403) {
    throw new Error(`Forbidden: ${providerId}`);
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${providerId} error ${res.status}: ${errText}`);
  }

  const data = await res.json() as any;
  return {
    content: data.choices?.[0]?.message?.content || '',
    tool_calls: data.choices?.[0]?.message?.tool_calls || [],
    usage: data.usage,
    model: data.model || providerId,
    provider: providerId,
  };
}

async function callWorkersAI(env: Env, request: LLMRequest, model: string): Promise<LLMResponse> {
  const messages = request.messages.map(m => ({ role: m.role, content: m.content }));
  const res = await env.AI.run(model as any, { messages } as any);
  const response = res as any;
  return {
    content: response.response || response.message || '',
    tool_calls: [],
    model: model,
    provider: 'workers-ai',
  };
}

// ─── Main Router ───

export class LLMRouter {
  static async chat(env: Env, request: LLMRequest): Promise<LLMResponse> {
    const providers = await getProviders(env);
    const sorted = providers.sort((a, b) => a.priority - b.priority);

    let lastError: Error | null = null;

    for (const provider of sorted) {
      if (!canProceed(provider.id, provider.rate_limit.rpm)) {
        continue;
      }

      // Try each API key
      const maxKeyAttempts = provider.api_keys.length;
      for (let i = 0; i < maxKeyAttempts; i++) {
        const apiKey = getNextKey(provider.id, provider.api_keys);

        try {
          recordRequest(provider.id);

          // Select model
          const model = request.model || provider.models[0]?.model || 'llama-3.3-70b-versatile';

          let response: LLMResponse;

          if (provider.id === 'workers-ai') {
            response = await callWorkersAI(env, request, model);
          } else if (provider.type === 'gemini') {
            // Gemini has different endpoint shape
            response = await callOpenAICompatible(
              provider.base_url.replace('/v1beta', '/v1beta/openai'),
              apiKey,
              { ...request, model },
              provider.id
            );
          } else {
            // OpenAI-compatible (Groq, Cerebras, custom)
            response = await callOpenAICompatible(
              provider.base_url, apiKey, { ...request, model }, provider.id
            );
          }

          return response;
        } catch (err: any) {
          console.error(`Provider ${provider.id} key attempt ${i}: ${err.message}`);
          lastError = err;
          continue; // try next key
        }
      }

      // Try fallback providers
      for (const fallbackId of provider.fallback_chain) {
        const fallback = providers.find(p => p.id === fallbackId);
        if (!fallback) continue;
        try {
          const model = fallback.models[0]?.model || 'llama-3.2-3b-instruct';
          const apiKey = fallback.api_keys[0];
          let response: LLMResponse;
          if (fallback.id === 'workers-ai') {
            response = await callWorkersAI(env, request, model);
          } else {
            response = await callOpenAICompatible(
              fallback.base_url, apiKey, { ...request, model }, fallback.id
            );
          }
          return response;
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }
    }

    throw new Error(`All LLM providers exhausted. Last error: ${lastError?.message || 'none'}`);
  }

  // ─── Admin: Add custom provider ───

  static async addProvider(env: Env, provider: ProviderConfig): Promise<boolean> {
    const existing = await env.CONFIG.get('custom_providers');
    const list = existing ? JSON.parse(existing) as ProviderConfig[] : [];
    list.push(provider);
    await env.CONFIG.put('custom_providers', JSON.stringify(list));
    return true;
  }

  // ─── Admin: List providers ───

  static async listProviders(env: Env): Promise<ProviderConfig[]> {
    return await getProviders(env);
  }

  // ─── Admin: Remove provider ───

  static async removeProvider(env: Env, id: string): Promise<boolean> {
    const existing = await env.CONFIG.get('custom_providers');
    if (!existing) return false;
    const list = JSON.parse(existing) as ProviderConfig[];
    const filtered = list.filter(p => p.id !== id);
    await env.CONFIG.put('custom_providers', JSON.stringify(filtered));
    return true;
  }
}
