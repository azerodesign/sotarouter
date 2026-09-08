# SotaRouter — Ultra-Low Latency AI Gateway & Smart Key Pool

State of the Art AI Router for High-Throughput Teams. Built with Go and a clean, high-density SaaS dashboard.

## Features
- **Unified Gateway**: OpenAI & Anthropic API compatibility.
- **Smart Key Pool**: Dynamic key rotation with auto-cooldown on 429/5xx.
- **Provider control plane**: Manual 9Router `providerConnections` JSON import with validation, recursive credential redaction, model-lock and backoff metadata.
- **Gateway prototype**: OpenAI-compatible JSON proxy with request auth and upstream auth.
- **Streaming-compatible transport**: Upstream response headers/body are passed through; full routing and SSE policy are next.

Provider import is explicit: export JSON from 9Router, paste it into SotaRouter. SotaRouter does not read the 9Router database automatically. The first Go gateway slice is functional; durable provider storage, routing/failover, and production authentication remain next.

## Live Demo
- Landing Page & Dashboard: Deployed on Vercel.
