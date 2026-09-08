"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Coins,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileJson,
  Key,
  Layers,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

export type Tab =
  | "overview"
  | "endpoint"
  | "providers"
  | "analytics"
  | "logs"
  | "token-saver"
  | "cli-tools";

export type Provider = {
  id: string;
  provider: string;
  authType?: string;
  name?: string;
  email?: string;
  priority?: number;
  isActive?: boolean;
  testStatus?: string;
  lastError?: string | null;
  errorCode?: string | null;
  backoffLevel?: number;
  modelLocks?: string[];
  baseUrl?: string;
  apiKey?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type GatewayStats = {
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  activeStreams: number;
  estimatedTokens: number;
  providerCount: number;
};

export type LogItem = {
  timestamp: string;
  model: string;
  provider: string;
  status: number;
  latencyMs: number;
  stream: boolean;
  error?: string;
};

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-1 text-xs font-medium transition-colors ${
        active
          ? "border-emerald-400 text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-200"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

function StatusPill({
  status,
  error,
}: {
  status?: string;
  error?: string | null;
}) {
  const unhealthy = Boolean(error) || status === "unavailable" || status === "error";
  const pending = status === "unknown" || status === "cooldown";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${
        unhealthy
          ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
          : pending
          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      }`}
    >
      {unhealthy ? (
        <AlertTriangle className="h-3 w-3" />
      ) : pending ? (
        <Clock3 className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {error ? "error" : status || "active"}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Database;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <article className="surface rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between text-zinc-500">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
          {label}
        </span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {value}
      </div>
      <div
        className={`mt-1 font-mono text-[11px] ${
          tone === "good"
            ? "text-emerald-400"
            : tone === "warn"
            ? "text-amber-400"
            : "text-zinc-500"
        }`}
      >
        {detail}
      </div>
    </article>
  );
}

function ProviderCard({
  provider,
  onInspect,
  onDelete,
}: {
  provider: Provider;
  onInspect: (provider: Provider) => void;
  onDelete: (id: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const providerSlug = provider.provider
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  // Extract key or token from provider object
  const rawKey =
    provider.apiKey ||
    (typeof provider.data?.apiKey === "string"
      ? provider.data.apiKey
      : typeof provider.data?.accessToken === "string"
      ? provider.data.accessToken
      : "");

  const handleCopyKey = async () => {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  return (
    <article className="surface provider-card group flex min-h-[220px] flex-col justify-between rounded-2xl p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 font-mono text-xs font-semibold uppercase text-zinc-200">
              <img
                src={`/providers/${providerSlug}.png`}
                alt={provider.provider}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  (e.target as HTMLElement).parentElement!.innerText = provider.provider
                    .slice(0, 2)
                    .toUpperCase();
                }}
              />
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/providers/${encodeURIComponent(
                  provider.provider.toLowerCase()
                )}`}
                className="flex items-center gap-1.5 truncate text-sm font-semibold uppercase tracking-tight text-white hover:text-emerald-400"
              >
                {provider.provider}{" "}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
                {provider.name || provider.email || provider.id}
              </p>
            </div>
          </div>
          <StatusPill status={provider.testStatus} error={provider.lastError} />
        </div>

        {provider.lastError && (
          <p className="mt-3 truncate rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 font-mono text-[10px] text-amber-300">
            {provider.lastError}
          </p>
        )}

        {/* API Key / Credential Display */}
        {rawKey && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-1.5 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <Key className="h-3 w-3 text-emerald-400/80" />
              {showKey ? (
                <span className="max-w-[130px] truncate text-zinc-200 sm:max-w-[180px]">
                  {rawKey}
                </span>
              ) : (
                <span className="text-zinc-600">••••••••••••••••</span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-zinc-500 hover:text-zinc-300"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-zinc-500 hover:text-emerald-400"
                title="Copy key"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 font-mono text-[11px]">
          <div>
            <span className="block text-zinc-600">Auth</span>
            <strong className="mt-0.5 block uppercase text-zinc-300">
              {provider.authType || "apikey"}
            </strong>
          </div>
          <div>
            <span className="block text-zinc-600">Priority</span>
            <strong className="mt-0.5 block text-emerald-400">
              {provider.priority || 1}
            </strong>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[10px]">
          <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-500">
            {provider.modelLocks?.length ?? 0} model locks
          </span>
          {(provider.backoffLevel ?? 0) > 0 && (
            <span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 text-amber-300">
              backoff {provider.backoffLevel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
        <Link
          href={`/dashboard/providers/${encodeURIComponent(
            provider.provider.toLowerCase()
          )}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          Open Panel →
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onInspect(provider)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={() => onDelete(provider.id)}
            className="rounded p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400"
            aria-label="Delete provider"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function Dashboard({ initialTab = "overview" }: { initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<"paste" | "file">("file");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "cooldown" | "oauth" | "direct"
  >("all");

  // Stats & Logs state
  const [stats, setStats] = useState<GatewayStats>({
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    activeStreams: 0,
    estimatedTokens: 0,
    providerCount: 0,
  });
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Token Saver values
  const [tokenSaverValues, setTokenSaverValues] = useState<Record<string, string>>({
    rtk: "Balanced",
    headroom: "Balanced",
    caveman: "Ultra",
    ponytail: "Ultra",
  });

  // Handle URL hash routing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (
        [
          "overview",
          "endpoint",
          "providers",
          "analytics",
          "logs",
          "token-saver",
          "cli-tools",
        ].includes(hash)
      ) {
        setActiveTab(hash);
      }
    }
  }, []);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenu(false);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
    }
  };

  // Provider Data Fetching with LocalStorage Cache
  useEffect(() => {
    const cached = localStorage.getItem("sotarouter_providers_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProviders(parsed);
          setLoading(false);
        }
      } catch {}
    }

    let cancelled = false;
    void fetch("/api/providers", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          success?: boolean;
          providers?: Provider[];
          error?: string;
        };
        if (!response.ok || !data.success)
          throw new Error(data.error || "Provider sync failed");
        if (!cancelled && data.providers && data.providers.length > 0) {
          setProviders(data.providers);
          localStorage.setItem(
            "sotarouter_providers_cache",
            JSON.stringify(data.providers)
          );
        }
      })
      .catch(() => {
        if (!cancelled && !cached)
          setImportStatus(
            "Provider sync unavailable. Retry after the gateway is ready."
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll stats and logs
  useEffect(() => {
    const fetchStatsAndLogs = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/logs", { cache: "no-store" }),
        ]);
        if (statsRes.ok) {
          const s = await statsRes.json();
          if (s.stats) setStats(s.stats);
        }
        if (logsRes.ok) {
          const l = await logsRes.json();
          if (Array.isArray(l.logs)) setLogs(l.logs);
        }
      } catch {}
    };

    fetchStatsAndLogs();
    const interval = setInterval(fetchStatsAndLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredProviders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return providers.filter((p) => {
      // 1. Text search
      if (term) {
        const hay = [p.provider, p.name, p.email, p.authType, p.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      // 2. Status filter
      if (statusFilter === "active") return p.testStatus !== "cooldown" && !p.lastError;
      if (statusFilter === "cooldown") return p.testStatus === "cooldown" || Boolean(p.lastError);
      if (statusFilter === "oauth") return p.authType === "oauth";
      if (statusFilter === "direct") return p.authType !== "oauth";
      return true;
    });
  }, [providers, query, statusFilter]);

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  };

  const importJson = async () => {
    if (!jsonInput.trim()) return;
    setImportStatus("Validating connection records...");
    try {
      const parsed = JSON.parse(jsonInput);
      const response = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_json", data: parsed }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Import failed");
      setProviders(data.providers);
      localStorage.setItem(
        "sotarouter_providers_cache",
        JSON.stringify(data.providers)
      );
      setImportStatus(
        `Imported ${data.providers.length} provider connections.`
      );
      setTimeout(() => {
        setShowImport(false);
        setImportStatus(null);
        setJsonInput("");
      }, 900);
    } catch (error) {
      setImportStatus(
        `Import failed: ${error instanceof Error ? error.message : "invalid JSON"}`
      );
    }
  };

  const deleteProvider = async (id: string) => {
    const remaining = providers.filter((p) => p.id !== id);
    setProviders(remaining);
    localStorage.setItem(
      "sotarouter_providers_cache",
      JSON.stringify(remaining)
    );
    try {
      await fetch(`/api/providers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const clearProviders = () => {
    if (!window.confirm("Clear all provider connections from this pool?")) return;
    setProviders([]);
    localStorage.removeItem("sotarouter_providers_cache");
  };

  return (
    <div className="grid-bg min-h-screen bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 font-mono text-sm font-bold text-zinc-950 shadow-[0_0_16px_rgba(52,211,153,0.35)] transition group-hover:scale-105">
                S
              </span>
              <span className="font-semibold tracking-tight text-white">
                SotaRouter
              </span>
            </Link>
            <span className="hidden rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline-block">
              v1.1.0 Go Core
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 font-mono text-[11px] text-zinc-400 md:flex">
              <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span>Gateway live (:3300)</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="rounded-lg border border-zinc-800 p-2 text-zinc-400 lg:hidden"
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Nav */}
        <div className="flex overflow-x-auto border-t border-zinc-800/60 px-4 py-1.5 lg:hidden">
          <div className="flex gap-4">
            <TabButton active={activeTab === "overview"} onClick={() => switchTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={activeTab === "endpoint"} onClick={() => switchTab("endpoint")}>
              Endpoint
            </TabButton>
            <TabButton active={activeTab === "providers"} onClick={() => switchTab("providers")}>
              Providers ({providers.length})
            </TabButton>
            <TabButton active={activeTab === "analytics"} onClick={() => switchTab("analytics")}>
              Analytics
            </TabButton>
            <TabButton active={activeTab === "logs"} onClick={() => switchTab("logs")}>
              Live Logs
            </TabButton>
          </div>
        </div>
      </header>

      {/* Persistent Desktop Sidebar */}
      <aside className="fixed inset-y-16 left-0 z-30 hidden w-64 border-r border-zinc-800/80 bg-[#09090b] px-4 py-6 lg:block">
        <p className="px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          Control plane
        </p>
        <nav className="mt-4 space-y-1" aria-label="Primary navigation">
          <button
            type="button"
            onClick={() => switchTab("overview")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "overview"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" /> Overview
          </button>
          <button
            type="button"
            onClick={() => switchTab("endpoint")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "endpoint"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Code2 className="h-4 w-4" /> Endpoint
          </button>
          <button
            type="button"
            onClick={() => switchTab("providers")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "providers"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Server className="h-4 w-4" /> Providers{" "}
            <span className="ml-auto rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
              {providers.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("token-saver")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "token-saver"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" /> Token Saver
          </button>
          <button
            type="button"
            onClick={() => switchTab("cli-tools")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "cli-tools"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Terminal className="h-4 w-4" /> CLI Tools
          </button>
          <button
            type="button"
            onClick={() => switchTab("analytics")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "analytics"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Coins className="h-4 w-4" /> Analytics
          </button>
          <button
            type="button"
            onClick={() => switchTab("logs")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              activeTab === "logs"
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Terminal className="h-4 w-4" /> Live logs
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1360px] px-4 py-7 sm:px-6 lg:ml-64 lg:px-8 lg:py-10">
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="rise-in space-y-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Gateway overview</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Router is operational.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  Unified AI gateway proxying OpenAI & Anthropic payloads with
                  automatic failover and non-buffering token streaming.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600">
                <RefreshCw className="h-3.5 w-3.5" /> Engine live on :3300
              </div>
            </div>

            <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]" aria-label="Gateway status">
              <article className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(26,64,48,.72),rgba(17,17,20,.96)_62%)] p-6 sm:p-8">
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="eyebrow text-emerald-300/80">Primary gateway</span>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                        SotaRouter Go Core
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                    </span>
                  </div>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50/70">
                    High-throughput goroutine proxy running in background.
                    Cooldown on 429/5xx triggers auto-failover to standby providers.
                  </p>
                  <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
                    <div>
                      <div className="font-mono text-3xl font-semibold tracking-tight text-white">
                        {providers.length}
                      </div>
                      <div className="mt-1 text-xs text-emerald-100/60">
                        Active Provider Connections
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-3xl font-semibold tracking-tight text-white">
                        {stats.activeStreams}
                      </div>
                      <div className="mt-1 text-xs text-emerald-100/60">
                        Active SSE Streams
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-3xl font-semibold tracking-tight text-white">
                        {stats.totalRequests}
                      </div>
                      <div className="mt-1 text-xs text-emerald-100/60">
                        Total Requests Routed
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article className="surface rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Endpoint</span>
                  <Code2 className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
                  <code className="font-mono text-base font-semibold text-white">
                    Active (port :3300)
                  </code>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  OpenAI and Anthropic compatible endpoint listening. Use in
                  Cursor, Cline, Hermes, or LangChain.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[10px] text-emerald-400">
                    /v1/chat/completions
                  </span>
                  <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[10px] text-emerald-300">
                    SSE streaming ready
                  </span>
                </div>
              </article>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                label="Providers"
                value={providers.length}
                detail="Ready in pool"
                icon={Server}
                tone="good"
              />
              <Metric
                label="Total Requests"
                value={stats.totalRequests}
                detail="Across all sessions"
                icon={Activity}
              />
              <Metric
                label="Success Rate"
                value={
                  stats.totalRequests > 0
                    ? `${(
                        (stats.successRequests / stats.totalRequests) *
                        100
                      ).toFixed(1)}%`
                    : "100%"
                }
                detail="Failover protected"
                icon={Zap}
                tone="good"
              />
              <Metric
                label="Tokens Estimated"
                value={
                  stats.estimatedTokens > 1000
                    ? `${(stats.estimatedTokens / 1000).toFixed(1)}k`
                    : stats.estimatedTokens
                }
                detail="Approximate routed tokens"
                icon={Database}
              />
            </div>
          </div>
        )}

        {/* TAB: ENDPOINT */}
        {activeTab === "endpoint" && (
          <div className="rise-in space-y-7">
            <div>
              <p className="eyebrow">Integration Guide</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                API Endpoint & SDKs.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Configure your IDE, AI agent, or backend service to route
                through SotaRouter.
              </p>
            </div>

            <article className="surface rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white">
                Base URL Configuration
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500">Localhost (VPS): </span>
                    <span className="text-emerald-400">http://127.0.0.1:3300/v1</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText("http://127.0.0.1:3300/v1", "local_url")}
                    className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white"
                  >
                    {copied === "local_url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500">Public Domain: </span>
                    <span className="text-emerald-400">https://sota.azero.my.id/v1</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText("https://sota.azero.my.id/v1", "public_url")}
                    className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white"
                  >
                    {copied === "public_url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
            </article>

            <article className="surface rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white">cURL Example</h2>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
{`curl http://127.0.0.1:3300/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sotarouter-token" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello from SotaRouter"}],
    "stream": true
  }'`}
              </pre>
            </article>
          </div>
        )}

        {/* TAB: PROVIDERS */}
        {activeTab === "providers" && (
          <div className="rise-in space-y-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Provider Connections</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Your routing pool.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  Manage all upstream AI accounts. Cooldown applies
                  automatically on 429 errors.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]"
                >
                  <FileJson className="h-4 w-4" /> Import 9Router Backup
                </button>
                <button
                  type="button"
                  onClick={clearProviders}
                  disabled={!providers.length}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-400 transition hover:border-rose-400/30 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Clear Pool
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="surface flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  aria-label="Search providers"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search provider name, account, email, or auth type..."
                  className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/50"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {(
                  [
                    ["all", `All (${providers.length})`],
                    [
                      "active",
                      `Active (${
                        providers.filter(
                          (p) => p.testStatus !== "cooldown" && !p.lastError
                        ).length
                      })`,
                    ],
                    [
                      "cooldown",
                      `Cooldown (${
                        providers.filter(
                          (p) => p.testStatus === "cooldown" || Boolean(p.lastError)
                        ).length
                      })`,
                    ],
                    [
                      "oauth",
                      `OAuth (${
                        providers.filter((p) => p.authType === "oauth").length
                      })`,
                    ],
                    [
                      "direct",
                      `API Key (${
                        providers.filter((p) => p.authType !== "oauth").length
                      })`,
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-lg px-2.5 py-1.5 transition ${
                      statusFilter === key
                        ? "bg-emerald-400/15 border border-emerald-400/30 text-emerald-300"
                        : "border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Showing <strong>{filteredProviders.length}</strong> of{" "}
                  <strong>{providers.length}</strong> total providers
                </span>
                {loading && (
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Syncing...
                  </span>
                )}
              </div>

              {filteredProviders.length === 0 ? (
                <div className="surface rounded-2xl border-dashed p-10 text-center">
                  <h3 className="text-sm font-medium text-zinc-300">
                    No providers match filter
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-500">
                    Try clearing your search query or import your 9Router backup file.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
                  >
                    <Upload className="h-4 w-4" /> Import Backup
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProviders.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      onInspect={setSelectedProvider}
                      onDelete={deleteProvider}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB: TOKEN SAVER */}
        {activeTab === "token-saver" && (
          <div className="rise-in space-y-7">
            <div>
              <p className="eyebrow">Token Saver</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                Spend less context.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Configure output compression and prompt trimming behavior for
                downstream agents.
              </p>
            </div>

            <section className="space-y-3">
              {[
                {
                  id: "rtk",
                  title: "Compress tool output",
                  subtitle: "RTK",
                  description:
                    "Reduce repetitive command output before it reaches the model.",
                  options: ["Off", "Balanced", "Aggressive"],
                },
                {
                  id: "headroom",
                  title: "Compress context",
                  subtitle: "Headroom",
                  description:
                    "Keep long context within the configured token budget.",
                  options: ["Off", "Balanced", "Aggressive"],
                },
                {
                  id: "caveman",
                  title: "Compress LLM output",
                  subtitle: "Caveman",
                  description:
                    "Use terse output formatting for lower response token usage.",
                  options: ["Off", "Standard", "Ultra"],
                },
                {
                  id: "ponytail",
                  title: "Lazy senior dev",
                  subtitle: "Ponytail",
                  description:
                    "Prefer the smallest working implementation. Skip unnecessary abstractions.",
                  options: ["Off", "Standard", "Ultra"],
                },
              ].map((setting) => (
                <article
                  key={setting.id}
                  className="rounded-2xl border border-zinc-800 bg-[#111114] p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                        <Zap className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-medium text-white">
                          {setting.title}{" "}
                          <span className="font-mono text-xs text-zinc-600">
                            ({setting.subtitle})
                          </span>
                        </h2>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <select
                      value={tokenSaverValues[setting.id]}
                      onChange={(e) =>
                        setTokenSaverValues((curr) => ({
                          ...curr,
                          [setting.id]: e.target.value,
                        }))
                      }
                      className="h-10 min-w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/60"
                    >
                      {setting.options.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}

        {/* TAB: CLI TOOLS */}
        {activeTab === "cli-tools" && (
          <div className="rise-in space-y-7">
            <div>
              <p className="eyebrow">CLI Tools</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                Coding Assistant Integrations.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Agent environments compatible with the SotaRouter gateway.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  name: "Claude Code",
                  cmd: "claude",
                  desc: "Anthropic coding agent for terminal repository operations.",
                  status: "Ready",
                },
                {
                  name: "Hermes Agent",
                  cmd: "hermes",
                  desc: "Local multi-platform agent gateway and tool orchestrator.",
                  status: "Ready",
                },
                {
                  name: "Cursor",
                  cmd: "cursor",
                  desc: "AI code editor pointing to local OpenAI-compatible endpoint.",
                  status: "Ready",
                },
                {
                  name: "Cline",
                  cmd: "cline",
                  desc: "VSCode agentic extension with custom model routing.",
                  status: "Ready",
                },
              ].map((tool) => (
                <article
                  key={tool.cmd}
                  className="rounded-2xl border border-zinc-800 bg-[#111114] p-5"
                >
                  <div className="flex items-start justify-between">
                    <h2 className="text-sm font-medium text-white">
                      {tool.name}
                    </h2>
                    <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      {tool.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    {tool.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-950 p-2 font-mono text-xs text-zinc-400">
                    <span>{tool.cmd}</span>
                    <button
                      type="button"
                      onClick={() => copyText(tool.cmd, tool.cmd)}
                      className="text-zinc-500 hover:text-white"
                    >
                      {copied === tool.cmd ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="rise-in space-y-7">
            <div>
              <p className="eyebrow">Usage Intelligence</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                Live Gateway Telemetry.
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Real-time request metrics captured directly from the Go routing
                core.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                label="Total Requests"
                value={stats.totalRequests}
                detail="Direct & streamed"
                icon={Database}
              />
              <Metric
                label="Successful"
                value={stats.successRequests}
                detail="Delivered to client"
                icon={Zap}
                tone="good"
              />
              <Metric
                label="Failures / Cooldowns"
                value={stats.errorRequests}
                detail="Auto-retried / failed"
                icon={AlertTriangle}
                tone={stats.errorRequests > 0 ? "warn" : "neutral"}
              />
              <Metric
                label="Estimated Tokens"
                value={
                  stats.estimatedTokens > 1000
                    ? `${(stats.estimatedTokens / 1000).toFixed(1)}k`
                    : stats.estimatedTokens
                }
                detail="Approximated throughput"
                icon={Coins}
                tone="good"
              />
            </div>

            {stats.totalRequests === 0 ? (
              <section className="surface rounded-2xl border-dashed p-10 text-center">
                <Activity className="mx-auto h-8 w-8 text-zinc-600" />
                <h3 className="mt-3 text-sm font-medium text-zinc-300">
                  No requests recorded yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-500">
                  Send your first completion request to{" "}
                  <code className="font-mono text-emerald-400">
                    http://127.0.0.1:3300/v1/chat/completions
                  </code>{" "}
                  to stream real-time latency and throughput charts here.
                </p>
              </section>
            ) : (
              <section className="surface overflow-hidden rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white">
                  Throughput Summary
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {stats.totalRequests} total queries processed with{" "}
                  {stats.activeStreams} active stream connections.
                </p>
              </section>
            )}
          </div>
        )}

        {/* TAB: LOGS */}
        {activeTab === "logs" && (
          <div className="rise-in space-y-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Observability</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Live Request Logs.
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Inspect incoming routing decisions, upstream HTTP status, and
                  failovers.
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] text-emerald-300">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live Stream
              </span>
            </div>

            <section className="surface overflow-hidden rounded-2xl">
              {logs.length === 0 ? (
                <div className="p-12 text-center">
                  <Terminal className="mx-auto h-8 w-8 text-zinc-600" />
                  <h3 className="mt-3 text-sm font-medium text-zinc-300">
                    Listening for requests...
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-500">
                    The Go gateway on port :3300 is idle. Incoming requests will
                    stream into this table with exact status codes and latency.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/80 font-mono text-xs">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            log.status >= 400 ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-200">
                            POST /v1/chat/completions
                          </div>
                          <div className="mt-1 truncate text-xs text-zinc-500">
                            {log.model} · {log.provider}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                        <span>{log.latencyMs}ms</span>
                        <span
                          className={`font-semibold ${
                            log.status >= 400
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800/80 px-4 py-5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        SotaRouter · High-Concurrency Go Core · Next.js Control Plane
      </footer>

      {/* IMPORT 9ROUTER BACKUP MODAL */}
      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowImport(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
              <div>
                <p className="eyebrow text-emerald-300">Data Transfer</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Import from 9Router Backup
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Upload file backup <code className="font-mono text-zinc-300">.json</code> atau paste JSON export.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setImportMode("file")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  importMode === "file"
                    ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Upload File Backup
              </button>
              <button
                type="button"
                onClick={() => setImportMode("paste")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  importMode === "paste"
                    ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Paste JSON Text
              </button>
            </div>

            {importMode === "file" ? (
              <div className="mt-4">
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center cursor-pointer hover:border-emerald-400/50 transition">
                  <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                  <span className="text-sm font-medium text-zinc-200">
                    Klik untuk pilih file backup (.json / .txt)
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">
                    Format backup 9Router didukung langsung
                  </span>
                  <input
                    type="file"
                    accept=".json,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (content) {
                          setJsonInput(content);
                          setImportStatus(
                            `File "${file.name}" dimuat (${(
                              file.size / 1024
                            ).toFixed(1)} KB). Klik tombol Mulai Import.`
                          );
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
                {jsonInput && (
                  <p className="mt-3 text-xs text-emerald-400 font-mono">
                    ✓ File siap diimport ({jsonInput.length} karakter)
                  </p>
                )}
              </div>
            ) : (
              <textarea
                autoFocus
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={9}
                placeholder='[{"provider":"antigravity","authType":"oauth","data":{...}}]'
                className="mt-4 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/60"
              />
            )}

            {importStatus && (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 font-mono text-xs ${
                  importStatus.startsWith("Import failed")
                    ? "border-rose-400/20 bg-rose-400/5 text-rose-300"
                    : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                }`}
              >
                {importStatus}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="min-h-10 rounded-lg px-4 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void importJson()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                <Upload className="h-3.5 w-3.5" /> Mulai Import
              </button>
            </div>
          </section>
        </div>
      )}

      {/* INSPECT JSON MODAL */}
      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedProvider(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
              <div>
                <p className="eyebrow">Connection details</p>
                <h2 className="mt-2 text-xl font-semibold uppercase text-white">
                  {selectedProvider.provider}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedProvider.name ||
                    selectedProvider.email ||
                    selectedProvider.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <pre className="mt-5 max-h-[55vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">
              {JSON.stringify(selectedProvider, null, 2)}
            </pre>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    JSON.stringify(selectedProvider, null, 2),
                    "payload"
                  )
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                {copied === "payload" ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied === "payload" ? "Copied" : "Copy JSON"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="min-h-10 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
