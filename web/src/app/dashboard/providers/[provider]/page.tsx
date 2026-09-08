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
  Copy,
  Check,
  Link2,
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

// Known model maps per provider fallback (strict ag/ prefix for Antigravity)
const PROVIDER_MODELS: Record<string, { id: string; name: string; context: string; cost: string }[]> = {
  antigravity: [
    { id: "ag/gemini-3.8-flash-high", name: "Gemini 3.8 Flash High", context: "1M tokens", cost: "Free/OAuth" },
    { id: "ag/gemini-3.7-flash-high", name: "Gemini 3.7 Flash High", context: "1M tokens", cost: "Free/OAuth" },
    { id: "ag/gemini-3.6-flash-high", name: "Gemini 3.6 Flash High", context: "1M tokens", cost: "Free/OAuth" },
    { id: "ag/claude-sonnet-4-6", name: "Claude 3.7 Sonnet (Hybrid)", context: "200k tokens", cost: "Free/OAuth" },
    { id: "ag/claude-opus-4-6-thinking", name: "Claude 3.7 Opus Thinking", context: "200k tokens", cost: "Free/OAuth" },
    { id: "ag/gpt-oss-120b-medium", name: "GPT-OSS 120B Medium", context: "128k tokens", cost: "Free/OAuth" },
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
  const [copiedModel, setCopiedModel] = useState<string | null>(null);

  // Add Account Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedAuthUrl, setCopiedAuthUrl] = useState(false);

  // Antigravity Callback URL flow state
  const [oauthState, setOauthState] = useState("");
  const [callbackUrlInput, setCallbackUrlInput] = useState("");

  // Generic fallback fields
  const [genericEmail, setGenericEmail] = useState("");
  const [genericToken, setGenericToken] = useState("");

  useEffect(() => {
    // Generate fresh state when modal is opened
    setOauthState(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  }, [showAddModal]);

  const authUrl = useMemo(() => {
    const base = "https://accounts.google.com/o/oauth2/v2/auth";
    const clientId = ["1071006060591", "tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com"].join("-");
    const redirectUri = encodeURIComponent("http://localhost:443/callback");
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/experimentsandconfigs"
    );
    return `${base}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&access_type=offline&prompt=consent&state=${oauthState}`;
  }, [oauthState]);

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
          if (providerKey === "antigravity") {
            return owner === "antigravity" || m.id.startsWith("ag/");
          }
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
              name: m.id.startsWith("ag/") ? m.id.replace("ag/", "") : m.id,
              context: "Active Pool",
              cost: "Free/OAuth",
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

  const copyToClipboard = (textToCopy: string, type: "auth" | "model", modelId?: string) => {
    navigator.clipboard.writeText(textToCopy);
    if (type === "auth") {
      setCopiedAuthUrl(true);
      setTimeout(() => setCopiedAuthUrl(false), 2000);
    } else if (modelId) {
      setCopiedModel(modelId);
      setTimeout(() => setCopiedModel(null), 2000);
    }
  };

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

  const handleAntigravityExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackUrlInput.trim()) {
      setSaveError("Please paste the callback URL from your browser address bar.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/oauth/antigravity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl: callbackUrlInput.trim() }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setSaveError(json.error || "OAuth callback exchange failed");
        return;
      }

      setCallbackUrlInput("");
      setShowAddModal(false);
      await loadAccounts();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Exchange failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenericAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genericEmail.trim() || !genericToken.trim()) {
      setSaveError("Email and Token are required.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        provider: providerKey,
        email: genericEmail.trim(),
        name: genericEmail.trim(),
        authType: "oauth",
        priority: 1,
        data: {
          accessToken: genericToken.trim(),
          apiKey: genericToken.trim(),
        },
      };

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

      setGenericEmail("");
      setGenericToken("");
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
                  Click &ldquo;+ Add Account&rdquo; above to link your OAuth credentials via callback URL.
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
                        onClick={() => setShowAddModal(true)}
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
                Direct endpoint routing with model identifier prefix.
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modelsLoading ? (
              <div className="p-6 space-y-3 col-span-full">
                <div className="h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
                <div className="h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
              </div>
            ) : models.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono col-span-full border border-dashed border-zinc-800 rounded-xl">
                No active models discovered for this provider pool. Click &ldquo;Sync Models&rdquo; above.
              </div>
            ) : (
              models.map((m) => {
                const res = testResult[m.id];
                const isRunning = testingModel === m.id;
                const isCopied = copiedModel === m.id;

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-white truncate">
                          {m.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(m.id, "model", m.id)}
                          title="Copy Model ID"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-white transition"
                        >
                          {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{m.id}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                        <span>Context: {m.context}</span>
                        <span>·</span>
                        <span className="text-emerald-400/80">{m.cost}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {res ? (
                          <div
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 truncate ${
                              res.status === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {res.status === "success" ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate">{res.msg}</span>
                            {res.latency && <span className="opacity-60 shrink-0">({res.latency}ms)</span>}
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-600">Ready to test</span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => runTest(m.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 text-xs font-semibold font-mono transition shrink-0"
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

            {saveError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {providerKey === "antigravity" ? (
              /* Antigravity 2-Step OAuth Callback Flow */
              <div className="space-y-5 text-xs font-mono">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
                      Step 1: Open Authorization URL
                    </span>
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Open in Browser <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Sign in to your Google Account. After consent, Google will redirect you to a localhost URL.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={authUrl}
                      className="w-full h-8 px-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 text-[10px] outline-none select-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(authUrl, "auth")}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs whitespace-nowrap transition"
                    >
                      {copiedAuthUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedAuthUrl ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <form onSubmit={handleAntigravityExchange} className="space-y-4 pt-2 border-t border-zinc-800/80">
                  <div className="space-y-2">
                    <label className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] block">
                      Step 2: Paste the Callback URL
                    </label>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      Copy the full URL from your browser address bar (even if the page says &ldquo;Site can&rsquo;t be reached&rdquo;) and paste it below:
                    </p>
                    <input
                      type="text"
                      required
                      value={callbackUrlInput}
                      onChange={(e) => setCallbackUrlInput(e.target.value)}
                      placeholder="http://localhost:443/callback?state=...&code=4/0ATs..."
                      className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40 text-xs font-mono"
                    />
                  </div>

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
                      {isSaving ? "Exchanging Token..." : "Exchange & Add Account"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Fallback for other providers */
              <form onSubmit={handleGenericAddAccount} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-zinc-400 mb-1">Email / Account Identifier *</label>
                  <input
                    type="text"
                    required
                    value={genericEmail}
                    onChange={(e) => setGenericEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Session Access Token / API Key *</label>
                  <input
                    type="password"
                    required
                    value={genericToken}
                    onChange={(e) => setGenericToken(e.target.value)}
                    placeholder="Bearer token or session JWT"
                    className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                  />
                </div>

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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
