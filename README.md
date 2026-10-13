# cf-agent — Serverless AI Agent on Cloudflare Workers (Free Tier)

A full AI agent that runs entirely on **Cloudflare Workers' free tier** — no VPS, no GPU, no monthly bill. It is a multi-messenger bot (Telegram, Rubika, Bale, Eitaa) whose "brain" runs in a Cloudflare **Durable Object**, routes requests through an **LLM gateway**, and uses a **tool router** with 20+ built-in capabilities.

> Agent name: **Nahan** · Default LLM: `groq` · Fallback: `gemini`

## ✨ Features

- **Multi-messenger connectivity** — one agent, four chat platforms:
  - Telegram, Rubika, Bale, Eitaa (webhook-based; one worker serves all).
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

Register webhooks for the messengers you enable (the worker exposes
`/webhook/<platform>` routes), then deploy:

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

MIT — see [LICENSE](LICENSE). Built with [Hono](https://honojs.dev) and
[@cloudflare/agents](https://github.com/cloudflare/agents).
