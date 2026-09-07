"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Plus, 
  Key, 
  Terminal, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Database,
  TrendingUp,
  Clock,
  Layers
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "keys" | "logs">("overview");

  // Sample Key Pools
  const [keys, setKeys] = useState([
    { id: 1, provider: "OpenAI", key: "sk-proj-****8491", status: "READY", requests: 48102, weight: 10 },
    { id: 2, provider: "Anthropic", key: "sk-ant-****9201", status: "READY", requests: 32840, weight: 10 },
    { id: 3, provider: "Gemini", key: "AIzaSy****1042", status: "COOLDOWN", requests: 12410, weight: 5 },
  ]);

  // Sample Usage Logs / Transactions (like standard AI router dashboards)
  const recentLogs = [
    { id: "req_1", time: "23:48:12", model: "gemini-3.6-flash-high", provider: "Gemini Pool", inTokens: "148.2k", outTokens: "612", cost: "$0.056", status: 200 },
    { id: "req_2", time: "23:45:01", model: "claude-3-5-sonnet", provider: "Anthropic Pool", inTokens: "42.1k", outTokens: "1.2k", cost: "$0.144", status: 200 },
    { id: "req_3", time: "23:41:20", model: "gpt-4o", provider: "OpenAI Pool", inTokens: "12.8k", outTokens: "480", cost: "$0.078", status: 200 },
    { id: "req_4", time: "23:38:50", model: "gemini-3.6-flash-high", provider: "Gemini Pool", inTokens: "210.5k", outTokens: "840", cost: "$0.082", status: 200 },
  ];

  // Per Model Cost Distribution
  const modelStats = [
    { model: "gemini-3.6-flash-high", requests: 121, inTokens: "19,125,209", outTokens: "76,918", cost: "$7.22" },
    { model: "claude-3-5-sonnet-20241022", requests: 34, inTokens: "2,410,500", outTokens: "42,100", cost: "$3.45" },
    { model: "gpt-4o-2024-08-06", requests: 18, inTokens: "850,120", outTokens: "14,200", cost: "$1.88" },
  ];

  const [newProvider, setNewProvider] = useState("OpenAI");
  const [newKeySecret, setNewKeySecret] = useState("");
  const [newWeight, setNewWeight] = useState(10);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeySecret) return;
    const masked = newKeySecret.slice(0, 7) + "****" + newKeySecret.slice(-4);
    setKeys([
      ...keys,
      { id: Date.now(), provider: newProvider, key: masked, status: "READY", requests: 0, weight: newWeight }
    ]);
    setNewKeySecret("");
  };

  const handleRevoke = (id: number) => {
    setKeys(keys.filter(k => k.id !== id));
  };

  const handleResetCooldown = (id: number) => {
    setKeys(keys.map(k => k.id === id ? { ...k, status: "READY" } : k));
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

        {/* Clean Tabs (Overview, Token Analytics, Key Pools, Live Logs) */}
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
            <Key className="w-3.5 h-3.5" /> Key Pools ({keys.length})
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
            {/* Top Stat Cards (Like Redi Analytics) */}
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
                  <span>Estimated Cost</span>
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">$12.55</div>
                <div className="text-[11px] text-zinc-400 font-mono">Avg: $0.07 / req</div>
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

            {/* Recent API Call Activity List (Image Style) */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Recent API Routing Activity
                </h2>
                <button onClick={() => setActiveTab("analytics")} className="text-xs text-emerald-400 hover:underline font-mono">
                  Full Cost Breakdown &rarr;
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {recentLogs.map((log) => (
                  <div key={log.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="font-semibold text-white">{log.model}</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">{log.provider}</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
                      <span>In: {log.inTokens}</span>
                      <span>Out: {log.outTokens}</span>
                      <span className="font-semibold text-emerald-400">{log.cost}</span>
                      <span className="text-zinc-600">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOKEN & COST ANALYTICS (Matches Image Style) */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Summary Bar */}
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

            {/* Token Consumption Graph Visual */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Token Consumption (24h)
                </h2>
                <span className="text-xs text-zinc-500 font-mono">Peak: 00:00 UTC</span>
              </div>

              {/* SVG Line Graph Mock */}
              <div className="h-40 w-full flex items-end justify-between gap-1 pt-6 px-2">
                {[15, 22, 10, 35, 48, 80, 95, 60, 42, 30, 55, 70, 88, 100, 65, 40, 25, 30, 45, 60].map((h, i) => (
                  <div key={i} className="w-full bg-zinc-950 rounded-t border-t border-emerald-500/30 flex flex-col justify-end overflow-hidden">
                    <div 
                      className="bg-emerald-500/20 hover:bg-emerald-500/40 transition-all rounded-t"
                      style={{ height: `${h}%` }}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-850 pt-2">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>

            {/* Per-Model Cost Table */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Cost Distribution Per Model
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Model</th>
                      <th className="p-3">Requests</th>
                      <th className="p-3">Input Tokens</th>
                      <th className="p-3">Output Tokens</th>
                      <th className="p-3 text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {modelStats.map((stat, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold text-white">{stat.model}</td>
                        <td className="p-3">{stat.requests}</td>
                        <td className="p-3 text-zinc-400">{stat.inTokens}</td>
                        <td className="p-3 text-zinc-400">{stat.outTokens}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{stat.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: KEY POOLS */}
        {activeTab === "keys" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Add Key Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Register API Key to Pool
              </h2>
              
              <form onSubmit={handleAddKey} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-zinc-400 font-medium">Provider</label>
                  <select 
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                    <option value="Gemini">Gemini</option>
                  </select>
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-zinc-400 font-medium">API Key Secret</label>
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
                  <label className="block text-zinc-400 font-medium">Weight</label>
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

            {/* Key List Table */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Active Key Pools & Health
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Key Identifier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Requests</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {keys.map((k) => (
                      <tr key={k.id}>
                        <td className="p-3 font-semibold text-white">{k.provider}</td>
                        <td className="p-3 text-zinc-400">{k.key}</td>
                        <td className="p-3">
                          {k.status === "READY" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> READY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" /> COOLDOWN (429)
                            </span>
                          )}
                        </td>
                        <td className="p-3">{k.requests.toLocaleString()}</td>
                        <td className="p-3 text-right space-x-3">
                          {k.status === "COOLDOWN" && (
                            <button 
                              onClick={() => handleResetCooldown(k.id)}
                              className="text-emerald-400 hover:underline"
                            >
                              Reset
                            </button>
                          )}
                          <button 
                            onClick={() => handleRevoke(k.id)}
                            className="text-rose-400 hover:underline"
                          >
                            Revoke
                          </button>
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
