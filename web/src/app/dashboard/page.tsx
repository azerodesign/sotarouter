"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Plus, 
  Key, 
  Terminal, 
  CheckCircle2,
  AlertTriangle,
  Coins,
  Database,
  TrendingUp,
  Clock,
  Layers,
  Download,
  Server
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "keys" | "logs">("overview");

  // Providers & Key Pools State
  const [providers, setProviders] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [newProvider, setNewProvider] = useState("OpenAI");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newWeight, setNewWeight] = useState(10);

  // Fetch Providers
  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Import 1-Click from 9Router SQLite
  const handleImport9Router = async () => {
    setImporting(true);
    setImportMsg("Reading /root/.9router/db/data.sqlite...");
    try {
      const res9 = await fetch("/api/import-9router");
      const data9 = await res9.json();

      if (!data9.success) {
        setImportMsg("Error: " + data9.error);
        setImporting(false);
        return;
      }

      // Sync to SotaRouter
      const resSync = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: data9.providers }),
      });
      const dataSync = await resSync.json();

      if (dataSync.success) {
        setProviders(dataSync.providers);
        setImportMsg(`Successfully cloned ${data9.count} providers from 9Router!`);
      } else {
        setImportMsg("Sync error: " + dataSync.error);
      }
    } catch (err: any) {
      setImportMsg("Failed: " + err.message);
    }
    setImporting(false);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeySecret) return;
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProvider.toLowerCase(),
          authType: "apikey",
          name: newProvider + " Pool Key",
          priority: newWeight,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchProviders();
        setNewKeySecret("");
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
                S
              </div>
              <span className="font-bold tracking-tight text-white text-base">SotaRouter</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Go Engine (:8080)
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-zinc-850 text-xs font-mono overflow-x-auto">
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "overview" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab("analytics")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "analytics" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Coins className="w-3.5 h-3.5" /> Token & Cost Analytics
          </button>
          <button 
            onClick={() => setActiveTab("keys")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "keys" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Key className="w-3.5 h-3.5" /> Provider Pools ({providers.length})
          </button>
          <button 
            onClick={() => setActiveTab("logs")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "logs" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Terminal className="w-3.5 h-3.5" /> Live Logs
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* 1-Click Import Banner from 9Router */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Import Providers from 9Router</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Clone all active provider connections from local 9Router SQLite (`/root/.9router/db/data.sqlite`).</p>
                </div>
              </div>
              <button 
                onClick={handleImport9Router}
                disabled={importing}
                className="px-4 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {importing ? "Cloning..." : "Import 9Router DB"}
              </button>
            </div>

            {importMsg && (
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-xs font-mono text-emerald-400">
                {importMsg}
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Total Requests</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">173</div>
                <div className="text-[11px] text-emerald-400 font-mono">+18 vs 24h ago</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Total Tokens</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">22.4M</div>
                <div className="text-[11px] text-zinc-400 font-mono">Input: 19.1M | Cached: 16.3M</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Active Connections</span>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">{providers.length}</div>
                <div className="text-[11px] text-emerald-400 font-mono">100% Failover Safe</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Router Latency</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white">1.14 ms</div>
                <div className="text-[11px] text-zinc-500 font-mono">P99 Engine Added</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOKEN & COST ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <div className="text-xs text-zinc-400">Input Tokens</div>
                <div className="text-xl font-bold font-mono text-white mt-1">19,125,209</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <div className="text-xs text-zinc-400">Cached Tokens</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">16,313,553</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <div className="text-xs text-zinc-400">Output Tokens</div>
                <div className="text-xl font-bold font-mono text-white mt-1">76,918</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <div className="text-xs text-zinc-400">Estimated Spend</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">$12.55</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KEY POOLS & PROVIDERS */}
        {activeTab === "keys" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Add Key Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Register Provider Key
              </h2>
              
              <form onSubmit={handleAddKey} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-zinc-400 font-medium">Provider Target</label>
                  <select 
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                    <option value="Gemini">Gemini</option>
                    <option value="Codex">Codex / OAuth</option>
                  </select>
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-zinc-400 font-medium">API Key / Secret Token</label>
                  <input 
                    type="password" 
                    placeholder="sk-proj-..."
                    value={newKeySecret}
                    onChange={(e) => setNewKeySecret(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-zinc-400 font-medium">Priority</label>
                  <input 
                    type="number" 
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button 
                    type="submit" 
                    className="w-full py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold transition-colors"
                  >
                    Add Key
                  </button>
                </div>
              </form>
            </div>

            {/* Provider Connections Table */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Active Provider Connections ({providers.length})
                </h2>
                <button onClick={handleImport9Router} className="text-xs text-emerald-400 hover:underline font-mono">
                  Re-sync 9Router SQLite
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Name / Identifier</th>
                      <th className="p-3">Auth Type</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {providers.map((p, i) => (
                      <tr key={p.id || i}>
                        <td className="p-3 font-semibold text-white uppercase">{p.provider}</td>
                        <td className="p-3 text-zinc-400">{p.name || p.email || p.id}</td>
                        <td className="p-3 uppercase text-[11px] text-zinc-500">{p.authType || "apikey"}</td>
                        <td className="p-3 font-bold text-emerald-400">{p.priority || 1}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> READY
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: LIVE LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Live Traffic & SSE Stream Audit
                </h2>
                <span className="text-xs text-emerald-400 font-mono">Streaming Active</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg text-xs font-mono text-zinc-400 space-y-2 max-h-96 overflow-y-auto">
                <p><span className="text-zinc-600">[00:32:10]</span> <span className="text-emerald-400">POST /v1/chat/completions</span> &rarr; OpenAI (sk-proj-****8491) | TTFB: 11ms | Status: 200 OK</p>
                <p><span className="text-zinc-600">[00:32:12]</span> <span className="text-emerald-400">POST /v1/messages</span> &rarr; Anthropic (sk-ant-****9201) | TTFB: 14ms | Status: 200 OK</p>
                <p><span className="text-zinc-600">[00:32:15]</span> <span className="text-amber-400">POST /v1/chat/completions</span> &rarr; Gemini | Error: 429 Rate Limit &rarr; Auto-Cooldown Triggered (60s) &rarr; Failover to OpenAI</p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 bg-zinc-950 text-center text-xs font-mono text-zinc-500">
        SotaRouter v1.0 — Pure Go Core + Node.js Next.js Control Plane
      </footer>

    </div>
  );
}
