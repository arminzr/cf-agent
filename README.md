# cf-agent — Serverless AI Agent on Cloudflare Workers (Free Tier)

A full AI agent that runs entirely on **Cloudflare Workers' free tier** — no VPS, no GPU, no monthly bill. It is a multi-messenger bot (Telegram, Rubika, Bale, Eitaa) whose "brain" runs in a Cloudflare **Durable Object**, routes requests through an **LLM gateway**, and uses a **tool router** with 20+ built-in capabilities.

> Agent name: **Nahan** · Default LLM: `groq` · Fallback: `gemini`

## ✨ Features

- **Multi-messenger connectivity** — one agent, four chat platforms: Telegram, Rubika, Bale, Eitaa (webhook-based; one worker serves all).
- **Durable Object brain** — `AgentDO` keeps per-user conversation state, so the agent stays context-aware without external storage.
- **LLM Gateway** — automatic routing to the default provider with fallback, right inside the worker.
- **20+ tools** via the Tool Router:

| Category | Tools |
|---|---|
| Language | translate, TTS (text→speech), STT (speech→text) |
| Web | search, news, url (fetch/scrape), youtube |
| Image | image (generate), ocr, qr, charts |
| Finance | crypto (prices), dollar (FX), weather, maps |
| Utility | code (run), calendar |

- **Cron triggers** — hourly health check, weekly Monday digest, 30-minute notification sweep.
- **RAG-ready** — Vectorize binding included (create the index, then enable RAG).

## 🧱 Architecture

```
Chat platform (webhook)
        │  incoming message
        ▼
Worker entrypoint  src/index.ts
        │  route by platform
        ▼
Webhook adapters  src/bots/{telegram,rubika,bale,eitaa}.ts
        ▼
Durable Object  src/agent.ts   (per-user state)
        ▼
LLM Router  src/gateway/router.ts
        ▼
Tool Router  src/tools/router.ts  →  20+ tools in src/tools/
```

## 🚀 Deploy

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com) (free tier).
- Node.js 18+ and [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/).

### Steps

```bash
npm install
```

Create the bindings referenced in `wrangler.toml` (replace the placeholder IDs):

```bash
# KV namespace (config + cache)
wrangler kv namespace create CONFIG
# D1 database (conversation history)
wrangler d1 create cf-agent-db
# Vectorize index (optional, for RAG)
wrangler vectorize create cf-agent-rag --dimensions 768 --metric cosine
# R2 bucket (file storage)
wrangler r2 bucket create cf-agent-files
```

Open `wrangler.toml` and fill in the real IDs for each binding, then set any secrets:

```bash
wrangler secret put GROQ_API_KEY
wrangler secret put GEMINI_API_KEY
```

Register webhooks for the messengers you enable (the worker exposes `/webhook/<platform>` routes), then deploy:

```bash
wrangler deploy     # production
wrangler dev        # local development
```

## ⚙️ Configuration

All non-secret config lives in the `[vars]` block of `wrangler.toml`:

| Var | Default | Purpose |
|---|---|---|
| `AGENT_NAME` | `Nahan` | The agent's display name |
| `VERSION` | `1.0.0` | Release version reported by `/health` |
| `DEFAULT_LLM` | `groq` | Primary model provider |
| `FALLBACK_LLM` | `gemini` | Provider used when the default is down |

Secrets (API keys, webhook tokens) are injected at runtime via `wrangler secret` — never commit them.

## 📁 Project Layout

```
src/
├── index.ts            Worker entrypoint
├── agent.ts            AgentDO — per-user agent state
├── types.ts            Shared types (Env, messages, platform config)
├── gateway/router.ts   LLM provider routing + fallback
├── tools/router.ts     Tool dispatch table
├── tools/*.ts          20+ individual tools
├── bots/*.ts           Telegram / Rubika / Bale / Eitaa adapters
```

## ✅ Health

```bash
curl https://<your-worker>.workers.dev/health
# {"status":"ok","agent":"Nahan","version":"1.0.0","uptime":...}
```

## 📄 License

MIT — see [LICENSE](LICENSE). Built with [Hono](https://honojs.dev) and [@cloudflare/agents](https://github.com/cloudflare/agents).

---

# نسخهٔ فارسی

# cf-agent — عامل هوش مصنوعی بدون سرور روی Cloudflare Workers (پلن رایگان)

یک عامل هوش مصنوعی کامل که کاملاً روی **پلن رایگان Cloudflare Workers** اجرا میشه — بدون VPS، بدون GPU، بدون هزینهٔ ماهانه. این یه بات چند-پیام‌رسانه (تلگرام، روبیکا، بله، ایتا) است که «مغزش» توی یک **Durable Object** کلادفلر اجرا میشه، درخواست‌ها رو از **LLM Gateway** عبور میده و با یک **Tool Router** بیش از ۲۰ قابلیت درون‌ساخته داره.

> نام عامل: **ناهان** · مدل پیش‌فرض: `groq` · جایگزین: `gemini`

## ✨ امکانات

- **اتصال چند پیام‌رسان** — یک عامل، چهار پلتفرم چت: تلگرام، روبیکا، بله، ایتا (مبتنی بر webhook؛ یک worker همه رو سرویس میده).
- **مغز Durable Object** — `AgentDO` وضعیت مکالمهٔ هر کاربر رو نگه می‌داره، پس عامل بدون نیاز به ذخیره‌سازی خارجی، حافظهٔ مکالمه‌ای داره.
- **درگاه LLM** — مسیریابی خودکار به‌سوی ارائه‌دهندهٔ پیش‌فرض به‌همراه fallback، درست داخل worker.
- **بیش از ۲۰ ابزار** از طریق Tool Router:

| دسته | ابزارها |
|---|---|
| زبان | ترجمه، TTS (متن→صدا)، STT (صدا→متن) |
| وب | جستجو، خبر، url (دریافت/اسکرپ)، یوتیوب |
| تصویر | تولید تصویر، OCR، QR، نمودار |
| مالی | رمزارز (قیمت)، دلار (نرخ ارز)، آب‌وهوا، نقشه |
| کاربردی | اجرای کد، تقویم |

- **ترکیب زمان‌بند (Cron)** — بررسی سلامت ساعتی، خلاصهٔ هفتگی دوشنبه، و پایش اعلان‌ها هر ۳۰ دقیقه.
- **آمادهٔ RAG** — بایندینگ Vectorize گنجانده شده (ایندکس رو بساز، بعد RAG رو فعال کن).

## 🧱 معماری

```
پیام‌رسان (webhook)
        │  پیام دریافتی
        ▼
نقطهٔ ورود Worker  src/index.ts
        │  مسیریابی بر اساس پلتفرم
        ▼
آداپترهای webhook  src/bots/{telegram,rubika,bale,eitaa}.ts
        ▼
Durable Object  src/agent.ts   (وضعیت هر کاربر)
        ▼
LLM Router  src/gateway/router.ts
        ▼
Tool Router  src/tools/router.ts  →  ۲۰+ ابزار در src/tools/
```

## 🚀 استقرار

### پیش‌نیازها

- یک [حساب Cloudflare](https://dash.cloudflare.com) (پلن رایگان).
- Node.js 18+ و [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/).

### مراحل

```bash
npm install
```

بایندینگ‌هایی که در `wrangler.toml` آمده رو بساز (مقدارهای placeholder رو جایگزین کن):

```bash
# KV namespace (تنظیمات و کش)
wrangler kv namespace create CONFIG
# دیتابیس D1 (تاریخچهٔ مکالمات)
wrangler d1 create cf-agent-db
# ایندکس Vectorize (اختیاری، برای RAG)
wrangler vectorize create cf-agent-rag --dimensions 768 --metric cosine
# باکت R2 (ذخیرهٔ فایل)
wrangler r2 bucket create cf-agent-files
```

فایل `wrangler.toml` رو باز کن و شناسه‌های واقعی هر بایندینگ رو بذار، بعد سکریت‌ها رو ست کن:

```bash
wrangler secret put GROQ_API_KEY
wrangler secret put GEMINI_API_KEY
```

وب‌هوک پیام‌رسان‌هایی که فعال می‌کنی رو ثبت کن (worker مسیرهای `/webhook/<platform>` رو ارائه میده)، بعد استقرار بده:

```bash
wrangler deploy     # محیط تولید
wrangler dev        # توسعهٔ محلی
```

## ⚙️ پیکربندی

تمام تنظیمات غیرسری در بخش `[vars]` فایل `wrangler.toml` قرار داره:

| متغیر | پیش‌فرض | کاربرد |
|---|---|---|
| `AGENT_NAME` | `Nahan` | نام نمایشی عامل |
| `VERSION` | `1.0.0` | نسخهٔ منتشرشده که `/health` گزارش میده |
| `DEFAULT_LLM` | `groq` | ارائه‌دهندهٔ مدل اصلی |
| `FALLBACK_LLM` | `gemini` | ارائه‌دهنده‌ای که وقتی اصلی در دسترس نیست استفاده میشه |

سکریت‌ها (کلیدهای API، توکن وب‌هوک) از طریق `wrangler secret` در زمان اجرا تزریق می‌شن — هرگز آن‌ها رو کامیت نکن.

## ✅ سلامتی/Health

```bash
curl https://<your-worker>.workers.dev/health
# {"status":"ok","agent":"Nahan","version":"1.0.0","uptime":...}
```

## 📄 مجوز

MIT — به [LICENSE](LICENSE) مراجعه کن. ساخته‌شده با [Hono](https://honojs.dev) و [@cloudflare/agents](https://github.com/cloudflare/agents). ساختهٔ **ارمین**.
