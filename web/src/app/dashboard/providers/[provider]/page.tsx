"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Server,
  Zap,
  Clock,
  Shield,
  ExternalLink,
  ChevronRight,
  Database,
  Trash2,
  Plus,
  Radio,
  Search,
  X,
  Key,
  RefreshCw,
} from "lucide-react";

type Account = {
  id: string;
  provider: string;
  name: string;
  email: string;
  priority: number;
  isActive: boolean;
  testStatus?: string;
  lastError?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
};

// Known model maps per provider fallback
const PROVIDER_MODELS: Record<string, { id: string; name: string; context: string; cost: string }[]> = {
  antigravity: [
    { id: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash High", context: "1M tokens", cost: "Low" },
    { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash High", context: "1M tokens", cost: "Low" },
    { id: "claude-sonnet-4-6", name: "Claude 3.7 Sonnet (Hybrid)", context: "200k tokens", cost: "Medium" },
    { id: "claude-opus-4-6-thinking", name: "Claude 3.7 Opus Thinking", context: "200k tokens", cost: "High" },
    { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B Medium", context: "128k tokens", cost: "Low" },
  ],
  codex: [
    { id: "gpt-4o", name: "GPT-4o (Codex)", context: "128k tokens", cost: "Medium" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", context: "128k tokens", cost: "Very Low" },
    { id: "o1-preview", name: "o1 Preview Reasoning", context: "128k tokens", cost: "High" },
    { id: "o3-mini", name: "o3 Mini Reasoning", context: "128k tokens", cost: "Medium" },
  ],
  claude: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet v2", context: "200k tokens", cost: "Medium" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", context: "200k tokens", cost: "Low" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", context: "200k tokens", cost: "High" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: "1M tokens", cost: "Low" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "2M tokens", cost: "Low" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context: "1M tokens", cost: "Very Low" },
  ],
};

const DEFAULT_MODELS = [
  { id: "default-chat", name: "Primary Chat Completion", context: "128k tokens", cost: "Dynamic" },
  { id: "gpt-4o", name: "GPT-4o Compatible", context: "128k tokens", cost: "Medium" },
];

export default function GenericProviderPage() {
  const params = useParams();
  const slug = (params?.provider as string) || "antigravity";
  const providerKey = slug.toLowerCase();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; latency?: number; msg?: string }>>({});
  const [filterQuery, setFilterQuery] = useState("");
  const [models, setModels] = useState<{ id: string; name: string; context: string; cost: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Add Account Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"form" | "json">("form");
  const [formEmail, setFormEmail] = useState("");
  const [formRefreshToken, setFormRefreshToken] = useState("");
  const [formAccessToken, setFormAccessToken] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.providers) {
        const matched = data.providers.filter((p: Account) => {
          const name = p.provider.toLowerCase();
          return (
            name === providerKey ||
            name.includes(providerKey) ||
            (providerKey.startsWith("openai") && name.includes("openai")) ||
            (providerKey === "codex" && name.includes("codex"))
          );
        });
        setAccounts(matched);
      }
    } catch {
      // Keep state
    } finally {
      setLoading(false);
    }
  }, [providerKey]);

  const syncModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const matched = data.data.filter((m: { id: string; owned_by?: string }) => {
          const owner = (m.owned_by || "").toLowerCase();
          if (providerKey === "codex" || providerKey === "openai") {
            return owner === "codex" || owner === "openai";
          }
          if (providerKey === "claude" || providerKey === "anthropic") {
            return owner === "claude" || owner === "anthropic";
          }
          return owner === providerKey || owner.includes(providerKey);
        });

        if (matched.length > 0) {
          setModels(
            matched.map((m: { id: string }) => ({
              id: m.id,
              name: m.id,
              context: "Active Pool",
              cost: "Dynamic",
            }))
          );
          setLastSynced(new Date().toLocaleTimeString());
          return;
        }
      }
      setModels(PROVIDER_MODELS[providerKey] || DEFAULT_MODELS);
      setLastSynced(new Date().toLocaleTimeString());
    } catch {
      setModels(PROVIDER_MODELS[providerKey] || DEFAULT_MODELS);
    } finally {
      setModelsLoading(false);
    }
  }, [providerKey]);

  useEffect(() => {
    loadAccounts();
    syncModels();
  }, [loadAccounts, syncModels]);

  const filteredAccounts = useMemo(() => {
    if (!filterQuery.trim()) return accounts;
    const q = filterQuery.toLowerCase();
    return accounts.filter((a) => (a.email || a.name || a.id).toLowerCase().includes(q));
  }, [accounts, filterQuery]);

  const handleDeleteAccount = async (id: string, email: string) => {
    if (!confirm(`Delete connection for ${email || id}?`)) return;
    try {
      const res = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert("Failed to delete account");
      }
    } catch {
      alert("Error deleting account");
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      let payload: Record<string, unknown> = {};

      if (addMode === "json") {
        try {
          const parsed = JSON.parse(rawJson);
          payload = parsed;
          if (!payload.provider) payload.provider = providerKey;
        } catch {
          setSaveError("Invalid JSON string. Please verify formatting.");
          setIsSaving(false);
          return;
        }
      } else {
        if (!formEmail.trim()) {
          setSaveError("Email or account identifier is required.");
          setIsSaving(false);
          return;
        }
        payload = {
          provider: providerKey,
          email: formEmail.trim(),
          name: formEmail.trim(),
          authType: "oauth",
          priority: 1,
          data: {
            refreshToken: formRefreshToken.trim(),
            accessToken: formAccessToken.trim() || formRefreshToken.trim(),
            apiKey: formAccessToken.trim() || formRefreshToken.trim(),
            clientId: formClientId.trim(),
            clientSecret: formClientSecret.trim(),
            projectId: formProjectId.trim(),
          },
        };
      }

      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setSaveError(json.error || "Failed to save account");
        return;
      }

      // Reset and close
      setFormEmail("");
      setFormRefreshToken("");
      setFormAccessToken("");
      setFormClientId("");
      setFormClientSecret("");
      setFormProjectId("");
      setRawJson("");
      setShowAddModal(false);

      await loadAccounts();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const runTest = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      const start = Date.now();
      const res = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerKey,
          model: modelId,
          prompt: "Ping test from SotaRouter control plane.",
        }),
      });
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult((prev) => ({
          ...prev,
          [modelId]: { status: "success", latency, msg: "200 OK — Responded" },
        }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [modelId]: {
            status: "error",
            latency,
            msg: json.error || `HTTP ${json.status || 500}`,
          },
        }));
      }
    } catch (err: unknown) {
      setTestResult((prev) => ({
        ...prev,
        [modelId]: { status: "error", msg: err instanceof Error ? err.message : "Network error" },
      }));
    } finally {
      setTestingModel(null);
    }
  };

  const displayName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <Link href="/dashboard" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/providers" className="hover:text-white">
            Providers
          </Link>
          <span>/</span>
          <span className="text-emerald-400 capitalize">{displayName}</span>
        </div>

        {/* Provider Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 p-2.5 flex items-center justify-center overflow-hidden">
              <img
                src={`/providers/${providerKey}.png`}
                alt={displayName}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/globe.svg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                  Pool Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Routing target configured for high-throughput failover & auto-cooldown.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/providers"
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition"
            >
              ← Back to All Providers
            </Link>
          </div>
        </div>

        {/* OAuth / Key Accounts Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">OAuth Connections</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {accounts.length} accounts configured for rotation & failover.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {accounts.length > 3 && (
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter accounts..."
                    className="w-full h-8 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-semibold font-mono transition shadow-sm whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Add Account
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-600 col-span-full">
                Loading accounts from pool...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-zinc-800 text-center col-span-full space-y-2">
                <p className="text-sm text-zinc-400">No connections configured for {displayName} yet.</p>
                <p className="text-xs text-zinc-600">
                  Click &ldquo;+ Add Account&rdquo; above to link your OAuth credentials or paste configuration.
                </p>
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const hasErr = Boolean(acc.lastError) || acc.testStatus === "unavailable";
                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold text-white truncate">
                          {acc.email || acc.name || acc.id}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                          ID: {acc.id.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                            hasErr
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {hasErr ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                          {hasErr ? "Warning" : "Active"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.id, acc.email || acc.name || acc.id)}
                          title="Delete Connection"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {acc.lastError && (
                      <div className="rounded bg-rose-500/5 border border-rose-500/15 px-2.5 py-1.5 font-mono text-[10px] text-rose-300 truncate">
                        {acc.lastError}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Priority: {acc.priority || 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormEmail(acc.email || acc.name || "");
                          setShowAddModal(true);
                        }}
                        className="hover:text-emerald-400 transition flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Replace Token
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Model Testing & Status Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" /> Model Availability & Testing
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Real-time completions benchmarked directly against your Go engine on port :3300.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastSynced && (
                <span className="text-[10px] font-mono text-zinc-500">
                  Synced: {lastSynced}
                </span>
              )}
              <button
                type="button"
                disabled={modelsLoading}
                onClick={syncModels}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition disabled:opacity-50"
              >
                <RotateCw className={`h-3 w-3 ${modelsLoading ? "animate-spin" : ""}`} />
                Sync Models
              </button>
            </div>
          </div>

          <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            {modelsLoading ? (
              <div className="p-6 space-y-3">
                <div className="h-12 bg-zinc-900/50 rounded-lg animate-pulse" />
                <div className="h-12 bg-zinc-900/50 rounded-lg animate-pulse" />
                <div className="h-12 bg-zinc-900/50 rounded-lg animate-pulse" />
              </div>
            ) : models.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                No active models discovered for this provider pool. Click &ldquo;Sync Models&rdquo; above.
              </div>
            ) : (
              models.map((m) => {
                const res = testResult[m.id];
                const isRunning = testingModel === m.id;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-zinc-900/30 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">{m.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {m.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                        <span>Context: {m.context}</span>
                        <span>·</span>
                        <span>Cost: {m.cost}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {res && (
                        <div
                          className={`text-xs font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                            res.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {res.status === "success" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          <span>{res.msg}</span>
                          {res.latency && <span className="opacity-60">({res.latency}ms)</span>}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => runTest(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 text-xs font-semibold font-mono transition"
                      >
                        {isRunning ? (
                          <>
                            <RotateCw className="h-3.5 w-3.5 animate-spin" /> Testing...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" /> Test
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Account Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Add Connection — {displayName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAddMode("form")}
                className={`flex-1 py-1.5 rounded-md transition ${
                  addMode === "form" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Structured Form
              </button>
              <button
                type="button"
                onClick={() => setAddMode("json")}
                className={`flex-1 py-1.5 rounded-md transition ${
                  addMode === "json" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Paste JSON
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-4">
              {addMode === "form" ? (
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="block text-zinc-400 mb-1">Email / Account Identifier *</label>
                    <input
                      type="text"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Refresh Token (OAuth) *</label>
                    <input
                      type="password"
                      value={formRefreshToken}
                      onChange={(e) => setFormRefreshToken(e.target.value)}
                      placeholder="1//0g..."
                      className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Access Token / API Key (Optional)</label>
                    <input
                      type="password"
                      value={formAccessToken}
                      onChange={(e) => setFormAccessToken(e.target.value)}
                      placeholder="Bearer token or sk-..."
                      className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">Client ID (Optional)</label>
                      <input
                        type="text"
                        value={formClientId}
                        onChange={(e) => setFormClientId(e.target.value)}
                        placeholder="Google Client ID"
                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Project ID (Optional)</label>
                      <input
                        type="text"
                        value={formProjectId}
                        onChange={(e) => setFormProjectId(e.target.value)}
                        placeholder="e.g. workspace-123"
                        className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs font-mono">
                  <label className="block text-zinc-400">Credential JSON</label>
                  <textarea
                    rows={8}
                    required
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    placeholder={`{\n  "email": "myaccount@gmail.com",\n  "refreshToken": "1//0g...",\n  "projectId": "my-project-123"\n}`}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40 font-mono text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-semibold font-mono transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <RotateCw className="h-3 w-3 animate-spin" />}
                  {isSaving ? "Saving..." : "Save Connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
