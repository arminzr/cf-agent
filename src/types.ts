// ─────────────────────────────────────────────────
// Types — Cloudflare Worker AI Agent
// ─────────────────────────────────────────────────

// Cloudflare Environment Bindings
export interface Env {
  // KV for config + cache
  CONFIG: KVNamespace;
  // R2 for file storage
  FILES: R2Bucket;
  // D1 database
  DB: D1Database;
  // Workers AI
  AI: Ai;
  // Vectorize for RAG
  VECTORIZE: VectorizeIndex;
  // Durable Object (Agent state)
  AGENT: DurableObjectNamespace;
  // Secrets (set via wrangler secret put)
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  E2B_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  RUBIKA_BOT_TOKEN: string;
  BALE_BOT_TOKEN: string;
  EITAA_BOT_TOKEN: string;
  // Vars
  AGENT_NAME: string;
  VERSION: string;
  DEFAULT_LLM: string;
  FALLBACK_LLM: string;
}

// LLM Provider Configuration
export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai' | 'groq' | 'gemini' | 'cerebras' | 'custom';
  base_url: string;
  api_keys: string[];
  rate_limit: { rpm: number; rpd: number };
  models: { name: string; model: string }[];
  priority: number;
  fallback_chain: string[];
  enabled: boolean;
}

// E2B key rotation
export interface E2BKey {
  id: string;
  key: string;
  label: string;
  active: boolean;
}

// Chat message
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

// Tool call from LLM
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Tool definition (OpenAI-compatible)
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Platform channels
export type PlatformChannel = 'telegram' | 'rubika' | 'bale' | 'eitaa' | 'discord' | 'email' | 'web';

// Incoming message from any platform
export interface IncomingMessage {
  platform: PlatformChannel;
  userId: string;
  chatId: string;
  text: string;
  type?: 'text' | 'voice' | 'photo' | 'callback' | 'unknown';
  fileId?: string;
  userName?: string;
  media?: {
    type: 'image' | 'voice' | 'file';
    url?: string;
    fileId?: string;
    mimeType?: string;
  };
  raw: any;
}

// Outgoing message
export interface OutgoingMessage {
  platform: PlatformChannel;
  chatId: string;
  text?: string;
  photoUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  caption?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'voice' | 'file';
  replyToMessageId?: number | string;
}

// Agent state stored in Durable Object
export interface AgentState {
  userId: string;
  platform: PlatformChannel;
  history: ChatMessage[];
  profile: {
    name?: string;
    language: string;
    preferences: Record<string, any>;
  };
  createdAt: number;
  lastActive: number;
  messageCount: number;
}

// LLM request
export interface LLMRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// LLM response
export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  provider: string;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
  latency_ms?: number;
}

// API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Slave node (cross-account worker)
export interface SlaveNode {
  url: string;
  apiKey: string;
  accountId: string;
  apiToken: string;
  workerName: string;
  status: 'active' | 'down';
  requestCount: number;
}
