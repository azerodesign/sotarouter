# SotaRouter ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black?logo=next.dot.js)](https://nextjs.org)

Ultra-low latency AI Gateway & Smart Key Pool built with a high-concurrency Go core and a modern Next.js management dashboard.

SotaRouter acts as a unified reverse proxy and intelligent load balancer for LLM APIs (OpenAI, Anthropic, Gemini, DeepSeek, Groq, OpenRouter, and custom endpoints).

---

## 🚀 Key Features

- **⚡ High-Throughput Go Core**: Concurrent HTTP proxy written in Go with non-blocking I/O and minimal memory overhead.
- **🔄 Smart Key Rotation & Balancing**: Round-robin and priority-weighted traffic routing across multiple provider accounts and API keys.
- **🛡️ Auto-Cooldown & Failover**: Upstream errors (HTTP 429 rate-limits or 5xx server issues) automatically trigger a 60-second cooldown with instant failover to healthy providers.
- **🌊 Native SSE Streaming**: Zero-buffering Server-Sent Events (SSE) pass-through for realtime token streaming without extra latency.
- **📦 Durable Storage**: Clean, local JSON storage (`~/.sotarouter/providers.json`) that survives server restarts.
- **🔄 9Router Migration**: Built-in importer to seamlessly migrate backup configs and provider connections from 9Router.
- **💻 Sleek Management Dashboard**: Dark Tech UI built with Next.js, Tailwind CSS, and Lucide icons.

---

## 🏗️ Architecture

```text
[Client / Agent / SDK]
         │
         ▼
[SotaRouter Gateway (Go :3300)]
  ├── /health               -> Gateway status
  ├── /v1/models            -> Aggregated model list
  ├── /v1/chat/completions  -> Proxy + Failover + SSE streaming
  └── /api/providers        -> Provider pool management
         │
         ├── Provider A (OpenAI)       [Healthy]
         ├── Provider B (Anthropic)    [Healthy]
         └── Provider C (DeepSeek)     [Cooldown 60s on 429]
```

---

## 🛠️ Quick Start

### 1. Build and Run the Go Gateway

```bash
# Clone the repository
git clone https://github.com/azerodesign/sotarouter.git
cd sotarouter

# Build gateway binary
go build -o bin/sotarouter-gateway ./cmd/server

# Run the gateway daemon
./bin/sotarouter-gateway
```

The gateway listens by default on `http://127.0.0.1:3300`.

### 2. Run the Next.js Dashboard

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 🔌 API Usage

SotaRouter is 100% drop-in compatible with standard OpenAI SDKs and tools (Hermes, Cursor, Cline, LangChain, etc.).

### cURL Example

```bash
curl http://127.0.0.1:3300/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer any-key-or-configured-secret" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello SotaRouter!"}
    ],
    "stream": true
  }'
```

### Python OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:3300/v1",
    api_key="sotarouter-local"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain quantum computing briefly"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

## 📂 Project Structure

```text
.
├── cmd/
│   └── server/          # Go gateway entrypoint and proxy logic
├── pkg/
│   └── provider/        # Provider types, rotation, and auto-cooldown pool
├── web/                 # Next.js 16 management dashboard
│   ├── src/app/         # App router pages and API routes
│   └── public/          # Static assets and provider icons
├── scripts/             # Backup import and migration helpers
└── LICENSE              # MIT License
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
