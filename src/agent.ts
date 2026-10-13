// ─────────────────────────────────────────────────
// Agent Core — Durable Object
// Stateful agent with conversation history, tool loop, LLM calls
// ─────────────────────────────────────────────────

import { DurableObject } from 'cloudflare:workers';
import type {
  AgentState, ChatMessage, IncomingMessage, LLMRequest,
  LLMResponse, ToolCall, ToolDefinition, ToolResult, Env,
  OutgoingMessage, PlatformChannel
} from './types';
import { LLMRouter } from './gateway/router';
import { ToolRouter } from './tools/router';
import { sendResponse } from './bots/dispatcher';

export class AgentDO extends DurableObject<Env> {
  private state: AgentState | null = null;

  // ─── Durable Object fetch handler (called from Worker) ───

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/handle' && request.method === 'POST') {
      const msg = await request.json() as IncomingMessage;
      const result = await this.handleMessage(msg);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/state' && request.method === 'GET') {
      const state = await this.getState();
      return new Response(JSON.stringify(state), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/clear' && request.method === 'POST') {
      await this.clearHistory();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  // ─── Lifecycle ───

  async ensureState(): Promise<AgentState> {
    if (this.state) return this.state;
    const stored = await this.ctx.storage.get<AgentState>('state');
    if (stored) {
      this.state = stored;
      return stored;
    }
    this.state = {
      userId: 'unknown',
      platform: 'web',
      history: [],
      profile: { language: 'fa', preferences: {} },
      createdAt: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
    };
    await this.ctx.storage.put('state', this.state);
    return this.state;
  }

  async saveState(): Promise<void> {
    if (this.state) {
      this.state.lastActive = Date.now();
      await this.ctx.storage.put('state', this.state);
    }
  }

  // ─── Main Agent Loop ───

  async handleMessage(msg: IncomingMessage): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const state = await this.ensureState();

      // Update state from message
      state.userId = msg.userId;
      state.platform = msg.platform;
      state.messageCount++;
      if (msg.userName) state.profile.name = msg.userName;

      // Handle media (if any)
      let userText = msg.text;
      if (msg.media) {
        userText = await this.processMedia(msg.media) + (userText ? '\n' + userText : '');
      }

      // Add user message to history
      const userMessage: ChatMessage = { role: 'user', content: userText };
      state.history.push(userMessage);

      // Trim history to last 20 messages (memory management)
      if (state.history.length > 20) {
        state.history = state.history.slice(-20);
      }

      // System prompt
      const systemPrompt = this.buildSystemPrompt(state);

      // LLM request
      const llmRequest: LLMRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          ...state.history,
        ],
        tools: ToolRouter.getAllTools(),
        temperature: 0.7,
        max_tokens: 4096,
      };

      // Tool loop — max 10 iterations
      let response = await LLMRouter.chat(this.env, llmRequest);
      let iterations = 0;
      const maxIterations = 10;

      while (response.tool_calls && response.tool_calls.length > 0 && iterations < maxIterations) {
        iterations++;

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          const result: ToolResult = await ToolRouter.execute(this.env, toolCall.function.name, args);

          // Add tool result to history
          state.history.push({
            role: 'tool',
            content: JSON.stringify(result),
            name: toolCall.function.name,
            tool_call_id: toolCall.id,
          });
        }

        // Add assistant message with tool calls to history
        state.history.push({
          role: 'assistant',
          content: response.content,
        });

        // Call LLM again with tool results
        const followupRequest: LLMRequest = {
          messages: [
            { role: 'system', content: systemPrompt },
            ...state.history,
          ],
          tools: ToolRouter.getAllTools(),
        };
        response = await LLMRouter.chat(this.env, followupRequest);
      }

      // Add final response to history
      state.history.push({ role: 'assistant', content: response.content });

      // Save state
      await this.saveState();

      // Send response to platform
      const outgoing: OutgoingMessage = {
        platform: msg.platform,
        chatId: msg.chatId,
        text: response.content,
      };

      await sendResponse(this.env, outgoing);

      return { success: true, response: response.content };
    } catch (err: any) {
      console.error('Agent error:', err);
      await this.saveState();
      const errorMsg: OutgoingMessage = {
        platform: msg.platform,
        chatId: msg.chatId,
        text: `⚠️ خطا: ${err.message || 'Unknown error'}`,
      };
      await sendResponse(this.env, errorMsg);
      return { success: false, error: err.message };
    }
  }

  // ─── System Prompt Builder ───

  buildSystemPrompt(state: AgentState): string {
    const lang = state.profile?.language || 'fa';
    const name = state.profile?.name || 'کاربر';

    return `تو ${this.env.AGENT_NAME || 'Nahan'} هستی — یک دستیار هوشمند AI که روی Cloudflare Workers اجرا می‌شود.

**قوانین:**
1. همیشه به زبان ${lang === 'fa' ? 'فارسی' : lang} پاسخ بده
2. کوتاه و دقیق پاسخ بده
3. اگه ابزاری برای جواب لازم داری، از tool استفاده کن
4. اعتبار ابزارها رو بررسی کن — اگه کار نکردن بگو
5. تاریخ و زمان فعلی: ${new Date().toISOString()}

**کاربر:** ${name}
**شناسه:** ${state.userId}
**پلتفرم:** ${state.platform}
**پیام‌های قبلی:** ${state.messageCount}

شما ابزارهای زیر را دارید:
- web_search: جستجو در وب
- code_exec: اجرای کد در sandbox لینوکس
- weather: آب و هوا
- crypto: قیمت ارز دیجیتال
- news: اخبار فارسی
- image_gen: تولید تصویر
- tts: تبدیل متن به صدا
- stt: تبدیل صدا به متن
- translate: ترجمه
- ocr: استخراج متن از عکس
- chart: ساخت نمودار (bar, line, pie)
- url_shorten: کوتاه‌سازی لینک
- qr_code: ساخت QR code
- youtube_transcript: استخراج متن ویدیو
- maps: موقعیت و نقشه
- calendar: تاریخ شمسی
- dollar_rate: قیمت دلار و طلا

همیشه از Markdown برای فرمت‌بندی استفاده کن.`;
  }

  // ─── Media Processing ───

  async processMedia(media: NonNullable<IncomingMessage['media']>): Promise<string> {
    if (media.type === 'image') {
      try {
        // Use Workers AI for image captioning (LLaVA model)
        const imageRes = await fetch(media.url || '');
        const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
        const result = await (this.env.AI as any).run(
          '@cf/llava-hf/llava-1.5-2b-hf',
          { image: imageBytes, prompt: 'Describe this image in detail' }
        );
        return `[تصویر دریافت شد — توضیح: ${JSON.stringify(result)}]`;
      } catch {
        return '[تصویر دریافت شد اما OCR انجام نشد]';
      }
    }
    if (media.type === 'voice') {
      try {
        const audioRes = await fetch(media.url || '');
        const audioBytes = await audioRes.arrayBuffer();
        const formData = new FormData();
        formData.append('file', new Blob([audioBytes]));
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'fa');
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.env.GROQ_API_KEY}` },
          body: formData,
        });
        const data = await res.json() as any;
        return `[پیام صوتی: ${data.text || 'ترجمه نشد'}]`;
      } catch {
        return '[پیام صوتی دریافت شد اما ترجمه نشد]';
      }
    }
    if (media.type === 'file') {
      return `[فایل دریافت شد: ${media.mimeType || 'unknown'}]`;
    }
    return '';
  }

  // ─── Admin: Clear History ───

  async clearHistory(): Promise<void> {
    const state = await this.ensureState();
    state.history = [];
    await this.saveState();
  }

  // ─── Admin: Get State ───

  async getState(): Promise<AgentState> {
    return await this.ensureState();
  }
}
