# SotaRouter — Ultra-Low Latency AI Gateway & Smart Key Pool

State of the Art AI Router for High-Throughput Teams. Built with Go and a clean, high-density SaaS dashboard.

## Features
- **Unified Gateway**: OpenAI & Anthropic API compatibility.
- **Smart Key Pool**: Dynamic key rotation with auto-cooldown on 429/5xx.
- **Provider control plane**: Manual 9Router `providerConnections` JSON import with validation, recursive credential redaction, model-lock and backoff metadata.
- **Zero-Latency SSE**: Direct streaming passthrough.
- **Pure Go Engine**: Low memory footprint (~24MB).

Provider import is explicit: export JSON from 9Router, paste it into SotaRouter. SotaRouter does not read the 9Router database automatically. Current web storage is in-memory; add durable storage and authentication before production multi-user use.

## Live Demo
- Landing Page & Dashboard: Deployed on Vercel.
