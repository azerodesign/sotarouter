"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Database, Copy, Check, Terminal, Server } from "lucide-react";

export default function Home() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeInstallTab, setActiveInstallTab] = useState<"cli" | "docker" | "go">("cli");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const installCommands = {
    cli: "git clone https://github.com/azerodesign/sotarouter.git",
    docker: "cd sotarouter/web && npm install && npm run dev",
    go: "cd sotarouter && go run ./cmd/server"
  };

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
            <a href="#local-install" className="hover:text-white text-zinc-400 transition-colors hidden sm:block">Local Install</a>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold transition-colors flex items-center gap-1.5">
              Launch Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 w-full flex-grow space-y-16">
        
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Open-source AI routing control plane
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            State of the Art AI Router for High-Throughput Teams
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            A control plane for importing provider connections, reviewing health metadata, and preparing a self-hosted AI gateway. Start with the web console.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link href="/dashboard" className="px-6 py-3.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-center text-sm transition-all">
              Open Web Console
            </Link>
            <a href="#local-install" className="px-6 py-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-center text-sm transition-all flex items-center justify-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> View local setup
            </a>
          </div>
        </div>

        {/* Local Installation Block (9Router-style) */}
        <div id="local-install" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">
                <Server className="w-4 h-4" /> Self-Hosted / Local Machine
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">Run SotaRouter Live</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">High-throughput Go data plane with automatic failover and smart key pooling.</p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
              <button 
                onClick={() => setActiveInstallTab("cli")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeInstallTab === "cli" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
              >
                One-Line Shell
              </button>
              <button 
                onClick={() => setActiveInstallTab("docker")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeInstallTab === "docker" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
              >
                Docker
              </button>
              <button 
                onClick={() => setActiveInstallTab("go")} 
                className={`px-3 py-1.5 rounded-md transition-colors ${activeInstallTab === "go" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
              >
                Go Install
              </button>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4 font-mono text-xs sm:text-sm">
            <div className="flex items-center gap-3 overflow-x-auto text-emerald-400 py-1">
              <Terminal className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{installCommands[activeInstallTab]}</span>
            </div>
            
            <button 
              onClick={() => copyToClipboard(installCommands[activeInstallTab], activeInstallTab)}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all flex items-center gap-1.5 text-xs font-mono shrink-0"
            >
              {copiedCmd === activeInstallTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Redacted by default</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Imported credentials are accepted server-side and masked before provider data reaches the public UI.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Manual provider import</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Paste or upload exported connection JSON. SotaRouter never reads a 9Router database automatically.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Control plane first</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Review provider metadata and model locks now. Routing, durable storage, and auth follow as separate releases.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 bg-zinc-950 text-center text-xs font-mono text-zinc-500">
        SotaRouter. Next.js control plane preview
      </footer>

    </div>
  );
}
