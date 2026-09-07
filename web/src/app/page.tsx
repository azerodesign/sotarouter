import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              S
            </div>
            <span className="font-bold tracking-tight text-lg text-white">SotaRouter</span>
          </Link>

          <nav className="flex items-center gap-6 text-xs font-mono">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold transition-colors flex items-center gap-1.5">
              Launch Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full flex-grow flex flex-col justify-center space-y-12">
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sub-millisecond Engine Written in Pure Go
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            State of the Art AI Router for High-Throughput Teams
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Unified API gateway with zero-buffering SSE passthrough, Thompson-sampled latency routing, and dynamic key pool failovers.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link href="/dashboard" className="px-6 py-3.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-center text-sm transition-all">
              Open SotaRouter Console
            </Link>
            <a href="https://github.com/azerodesign/sotarouter" target="_blank" className="px-6 py-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-center text-sm transition-all">
              View GitHub Source
            </a>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-850">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">1.14 ms Added Latency</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Goroutine-per-stream execution eliminates event loop blocks and GIL bottlenecks.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Auto-Cooldown Failover</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Instant 60s cooldown isolation on 429 rate-limits or 5xx provider outages.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">21 MB Memory Footprint</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Compiled single binary with CGO-free embedded SQLite ledger.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 bg-zinc-950 text-center text-xs font-mono text-zinc-500">
        SotaRouter v1.0 — Pure Go Core Engine + Next.js Control Plane
      </footer>

    </div>
  );
}
