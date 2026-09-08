"use client";

import { useEffect, useState, useMemo } from "react";
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

// Known model maps per provider
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
  kiro: [
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", context: "200k tokens", cost: "Medium" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "2M tokens", cost: "Low" },
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
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) {
          const matched = data.providers.filter((p: Account) => {
            const name = p.provider.toLowerCase();
            return name === providerKey || name.includes(providerKey) || (providerKey.startsWith("openai") && name.includes("openai"));
          });
          setAccounts(matched);
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
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
            return;
          }
        }
        setModels(PROVIDER_MODELS[providerKey] || DEFAULT_MODELS);
      })
      .catch(() => {
        setModels(PROVIDER_MODELS[providerKey] || DEFAULT_MODELS);
      })
      .finally(() => setModelsLoading(false));
  }, [providerKey]);

  const filteredAccounts = useMemo(() => {
    if (!filterQuery.trim()) return accounts;
    const q = filterQuery.toLowerCase();
    return accounts.filter((a) => (a.email || a.name || a.id).toLowerCase().includes(q));
  }, [accounts, filterQuery]);

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
              <h2 className="text-base font-semibold text-white">Connections in Pool</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {accounts.length} credentials and tokens loaded for round-robin rotation.
              </p>
            </div>
            {accounts.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter accounts..."
                  className="w-full h-8 pl-9 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 outline-none focus:border-emerald-400/40"
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-600 col-span-full">
                Loading accounts from pool...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-zinc-800 text-center col-span-full">
                <p className="text-sm text-zinc-400">No connections matching this provider yet.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Import connection JSON via the main dashboard or add credentials manually.
                </p>
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const hasErr = Boolean(acc.lastError) || acc.testStatus === "unavailable";
                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-white truncate">
                          {acc.email || acc.name || acc.id}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                          ID: {acc.id.slice(0, 14)}...
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                          hasErr
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {hasErr ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                        {hasErr ? "Issue" : "Active"}
                      </span>
                    </div>

                    {acc.lastError && (
                      <div className="rounded bg-rose-500/5 border border-rose-500/15 px-2.5 py-1.5 font-mono text-[10px] text-rose-300 truncate">
                        {acc.lastError}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Priority: {acc.priority || 1}</span>
                      <span>Strategy: round-robin</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Model Testing & Status Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Live Model Testing & Latency Verification
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Trigger real completions directly against your running SotaRouter Gateway on :3300.
            </p>
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
                No active models discovered for this provider pool.
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
    </div>
  );
}
