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
  Upload,
  Server,
  Trash2,
  X,
  FileText,
  Copy,
  Check
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "providers" | "analytics" | "logs">("overview");

  // Providers Data State
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);

  // Modal Import JSON State
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Provider State
  const [newProviderType, setNewProviderType] = useState("openai");
  const [newProvName, setNewProvName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newPriority, setNewPriority] = useState(1);

  // Fetch Providers
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Handle Manual JSON Import (User pastes 9Router providerConnections JSON)
  const handleImportJsonSubmit = async () => {
    if (!jsonInput.trim()) return;
    setImportStatus("Parsing JSON...");
    try {
      const parsedData = JSON.parse(jsonInput);
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_json",
          data: parsedData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
        setImportStatus(`Success! ${data.message}`);
        setTimeout(() => {
          setShowImportModal(false);
          setJsonInput("");
          setImportStatus(null);
        }, 1500);
      } else {
        setImportStatus("Error: " + data.error);
      }
    } catch (e: any) {
      setImportStatus("Invalid JSON: " + e.message);
    }
  };

  // Handle Clear All
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all imported providers?")) return;
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders([]);
      }
    } catch (e) {}
  };

  // Delete Single
  const handleDeleteProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
        if (selectedProvider?.id === id) setSelectedProvider(null);
      }
    } catch (e) {}
  };

  // Single Add Form
  const handleAddSingleProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProviderType,
          name: newProvName || newProviderType,
          apiKey: newApiKey,
          priority: Number(newPriority),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
        setNewProvName("");
        setNewApiKey("");
      }
    } catch (e) {}
  };

  const copyToClipboard = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              S
            </div>
            <span className="font-bold tracking-tight text-white text-base">SotaRouter</span>
          </Link>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Import JSON
            </button>
          </div>
        </div>

        {/* Clean Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-zinc-850 text-xs font-mono overflow-x-auto">
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "overview" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab("providers")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "providers" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Server className="w-3.5 h-3.5" /> Providers ({providers.length})
          </button>
          <button 
            onClick={() => setActiveTab("analytics")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "analytics" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Coins className="w-3.5 h-3.5" /> Token Analytics
          </button>
          <button 
            onClick={() => setActiveTab("logs")} 
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "logs" ? "border-emerald-400 text-white font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >
            <Terminal className="w-3.5 h-3.5" /> Live Logs
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-grow">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Quick Import Banner */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Import 9Router `providerConnections` JSON</h2>
                  <p className="text-xs text-zinc-400 mt-1">Paste your exported 9Router connections JSON file or text directly. Zero database locks.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs transition-colors shrink-0 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Paste & Import JSON
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-2">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Imported Connections</span>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-white">{providers.length}</div>
                <div className="text-[11px] text-emerald-400 font-mono">Active Provider Pool</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-2">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Auth Types</span>
                  <Key className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-white">OAuth / APIKey</div>
                <div className="text-[11px] text-zinc-500 font-mono">Auto Token Refresh</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-2">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>Total Tokens (24h)</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-white">22.4M</div>
                <div className="text-[11px] text-zinc-400 font-mono">Input: 19.1M | Out: 76.9k</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-2">
                <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
                  <span>P99 Engine Latency</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-white">1.14 ms</div>
                <div className="text-[11px] text-emerald-400 font-mono">Zero-Latency SSE</div>
              </div>
            </div>

          </div>
        )}

        {/* PROVIDERS CARDS & GRID TAB (9Router Style Visuals) */}
        {activeTab === "providers" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Active Provider Pool ({providers.length})</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Cloned Connections & Custom Key Accounts</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Import JSON Text
                </button>
                {providers.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    className="px-3.5 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Providers Card Grid */}
            {providers.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
                <Server className="w-12 h-12 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No Provider Connections Yet</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">Click "Import JSON" to paste your 9Router `providerConnections` data, or add single keys manually.</p>
                </div>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs transition-colors inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Import Provider JSON
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-xl space-y-4 transition-all group relative flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-mono font-bold text-white text-xs uppercase group-hover:border-emerald-500/40 transition-colors">
                            {p.provider.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{p.provider}</h3>
                            <p className="text-xs text-zinc-400 truncate max-w-[180px]">{p.name || p.email || p.id}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                          p.testStatus === "unavailable" || p.lastError 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {p.testStatus || "active"}
                        </span>
                      </div>

                      {p.lastError && (
                        <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20 text-[11px] font-mono text-amber-400/90 truncate">
                          ⚠️ {p.lastError}
                        </div>
                      )}

                      <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>Auth: <strong className="text-zinc-300 uppercase">{p.authType || "apikey"}</strong></span>
                        <span>Priority: <strong className="text-emerald-400">{p.priority || 1}</strong></span>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-zinc-850 text-xs font-mono">
                      <button 
                        onClick={() => setSelectedProvider(p)}
                        className="text-emerald-400 hover:underline text-[11px]"
                      >
                        Inspect Payload &rarr;
                      </button>

                      <button 
                        onClick={() => handleDeleteProvider(p.id)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Add Single Key Form */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Manually Add Key / Connection
              </h3>

              <form onSubmit={handleAddSingleProvider} className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-zinc-400 font-medium">Provider Type</label>
                  <input 
                    type="text" 
                    value={newProviderType} 
                    onChange={(e) => setNewProviderType(e.target.value)} 
                    placeholder="e.g. antigravity, kimchi, openai"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-zinc-400 font-medium">Name / Email</label>
                  <input 
                    type="text" 
                    value={newProvName} 
                    onChange={(e) => setNewProvName(e.target.value)} 
                    placeholder="e.g. user@domain.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-zinc-400 font-medium">API Key Secret</label>
                  <input 
                    type="password" 
                    value={newApiKey} 
                    onChange={(e) => setNewApiKey(e.target.value)} 
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button type="submit" className="w-full py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold transition-colors">
                    Add
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* ANALYTICS TAB */}
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

        {/* LOGS TAB */}
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

      {/* MODAL: Import JSON Text (Paste 9Router exported providerConnections) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" /> Import 9Router Connections JSON
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Paste your exported `providerConnections` array or JSON file contents below.</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <textarea 
                rows={10}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"id":"7b254d84...","provider":"antigravity","authType":"oauth","name":"user@gmail.com","data":"{...}"}]'
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {importStatus && (
              <div className="text-xs font-mono text-emerald-400 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                {importStatus}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportJsonSubmit}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs transition-colors font-mono"
              >
                Process & Import JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Provider Payload */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-bold">{selectedProvider.provider}</span>
                <h3 className="text-base font-bold text-white">{selectedProvider.name || selectedProvider.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedProvider(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>Payload Data JSON</span>
                <button 
                  onClick={() => copyToClipboard(JSON.stringify(selectedProvider, null, 2), "payload")}
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  {copiedId === "payload" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Copy JSON
                </button>
              </div>
              <pre className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl font-mono text-xs text-emerald-400 max-h-80 overflow-y-auto leading-relaxed">
                {JSON.stringify(selectedProvider, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end border-t border-zinc-800 pt-4">
              <button 
                onClick={() => setSelectedProvider(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 bg-zinc-950 text-center text-xs font-mono text-zinc-500">
        SotaRouter v1.0 — Pure Go Core + Node.js Next.js Control Plane
      </footer>

    </div>
  );
}
