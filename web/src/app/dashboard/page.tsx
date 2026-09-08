"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  FileJson,
  Layers3,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Settings2,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Tab = "overview" | "endpoint" | "providers" | "analytics" | "logs";
type Provider = {
  id: string;
  provider: string;
  authType?: string;
  name?: string;
  email?: string;
  priority?: number;
  testStatus?: string;
  lastError?: string | null;
  data?: Record<string, unknown>;
  errorCode?: string | null;
  backoffLevel?: number;
  modelLocks?: string[];
  expiresAt?: string | number | null;
  lastUsedAt?: string | number | null;
  updatedAt?: string;
  createdAt?: string;
};

type RecentLog = {
  id: string;
  time: string;
  model: string;
  provider: string;
  input: string;
  output: string;
  cost: string;
  status: number;
};

const recentLogs: RecentLog[] = [
  { id: "req_1", time: "23:48:12", model: "gemini-3.6-flash-high", provider: "Gemini pool", input: "148.2k", output: "612", cost: "$0.056", status: 200 },
  { id: "req_2", time: "23:45:01", model: "claude-3-5-sonnet", provider: "Anthropic pool", input: "42.1k", output: "1.2k", cost: "$0.144", status: 200 },
  { id: "req_3", time: "23:41:20", model: "gpt-4o", provider: "OpenAI pool", input: "12.8k", output: "480", cost: "$0.078", status: 200 },
  { id: "req_4", time: "23:38:50", model: "gemini-3.6-flash-high", provider: "Gemini pool", input: "210.5k", output: "840", cost: "$0.082", status: 200 },
];

const modelStats = [
  { model: "gemini-3.6-flash-high", requests: 121, input: "19,125,209", output: "76,918", cost: "$7.22" },
  { model: "claude-3-5-sonnet-20241022", requests: 34, input: "2,410,500", output: "42,100", cost: "$3.45" },
  { model: "gpt-4o-2024-08-06", requests: 18, input: "850,120", output: "14,200", cost: "$1.88" },
];

const chartPoints = "0,126 32,118 64,121 96,96 128,104 160,84 192,92 224,53 256,67 288,34 320,44 352,18 384,30 416,11 448,42 480,28 512,59 544,49 576,76 608,68 640,88 672,80 704,101 736,94";

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-1 text-xs font-medium transition-colors ${active ? "border-emerald-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, error }: { status?: string; error?: string | null }) {
  const unhealthy = Boolean(error) || status === "unavailable" || status === "error";
  const pending = status === "unknown" || status === "cooldown";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${
      unhealthy
        ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
        : pending
          ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    }`}>
      {unhealthy ? <AlertTriangle className="h-3 w-3" /> : pending ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {error ? "error" : status || "active"}
    </span>
  );
}

function ProviderCard({ provider, onInspect, onDelete }: { provider: Provider; onInspect: (provider: Provider) => void; onDelete: (id: string) => void }) {
  const providerSlug = provider.provider.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return (
    <article className="surface provider-card group flex min-h-[210px] flex-col justify-between rounded-2xl p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden p-1.5 font-mono text-xs font-semibold uppercase text-zinc-200">
              <img
                src={`/providers/${providerSlug}.png`}
                alt={provider.provider}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  (e.target as HTMLElement).parentElement!.innerText = provider.provider.slice(0, 2).toUpperCase();
                }}
              />
            </div>
            <div className="min-w-0">
              <Link href={`/dashboard/providers/${encodeURIComponent(provider.provider.toLowerCase())}`} className="truncate text-sm font-semibold uppercase tracking-tight text-white hover:text-emerald-400 flex items-center gap-1.5">
                {provider.provider} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="mt-1 truncate text-xs text-zinc-500">{provider.name || provider.email || provider.id}</p>
            </div>
          </div>
          <StatusPill status={provider.testStatus} error={provider.lastError} />
        </div>
        {provider.lastError && (
          <p className="mt-4 truncate rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 font-mono text-[10px] text-amber-300">
            {provider.lastError}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4 font-mono text-[11px]">
          <div>
            <span className="block text-zinc-600">Auth</span>
            <strong className="mt-1 block uppercase text-zinc-300">{provider.authType || "apikey"}</strong>
          </div>
          <div>
            <span className="block text-zinc-600">Priority</span>
            <strong className="mt-1 block text-emerald-400">{provider.priority || 1}</strong>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px]">
          <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-500">{provider.modelLocks?.length ?? 0} model locks</span>
          {(provider.backoffLevel ?? 0) > 0 && <span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-amber-300">backoff {provider.backoffLevel}</span>}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-3">
        <Link href={`/dashboard/providers/${encodeURIComponent(provider.provider.toLowerCase())}`} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">
          Open Panel →
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onInspect(provider)} className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
            Inspect
          </button>
          <button type="button" onClick={() => onDelete(provider.id)} className="rounded p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Delete provider">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, detail, icon: Icon, tone = "neutral" }: { label: string; value: string; detail: string; icon: typeof Activity; tone?: "neutral" | "good" }) {
  return (
    <article className="surface rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">{label}</span>
        <Icon className={tone === "good" ? "h-4 w-4 text-emerald-400" : "h-4 w-4 text-zinc-500"} />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</div>
      <div className={`mt-1 font-mono text-[11px] ${tone === "good" ? "text-emerald-400" : "text-zinc-600"}`}>{detail}</div>
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
  const [newProviderType, setNewProviderType] = useState("openai");
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newPriority, setNewPriority] = useState(1);
  const [showCompatible, setShowCompatible] = useState<"openai" | "anthropic" | null>(null);
  const [compatibleName, setCompatibleName] = useState("");
  const [compatiblePrefix, setCompatiblePrefix] = useState("");
  const [compatibleBaseUrl, setCompatibleBaseUrl] = useState("");
  const [compatibleApiKey, setCompatibleApiKey] = useState("");
  const [compatibleModel, setCompatibleModel] = useState("");
  const [compatibleStatus, setCompatibleStatus] = useState<string | null>(null);

  useEffect(() => {
    // 1. First check LocalStorage for persistent client-side cache
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
        const data = await response.json() as { success?: boolean; providers?: Provider[]; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || "Provider sync failed");
        if (!cancelled && data.providers && data.providers.length > 0) {
          setProviders(data.providers);
          localStorage.setItem("sotarouter_providers_cache", JSON.stringify(data.providers));
        }
      })
      .catch(() => {
        if (!cancelled && !cached) setImportStatus("Provider sync unavailable. Retry after the gateway is ready.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredProviders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return providers;
    return providers.filter((provider) => [provider.provider, provider.name, provider.email, provider.authType].join(" ").toLowerCase().includes(term));
  }, [providers, query]);

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
      localStorage.setItem("sotarouter_providers_cache", JSON.stringify(data.providers));
      setImportStatus(`Imported ${data.providers.length} provider connections.`);
      setTimeout(() => {
        setShowImport(false);
        setImportStatus(null);
        setJsonInput("");
      }, 900);
    } catch (error) {
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : "invalid JSON"}`);
    }
  };

  const addProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: newProviderType, name: newName || newProviderType, apiKey: newApiKey, priority: Number(newPriority) }),
    });
    const data = await response.json();
    if (data.success) {
      setProviders(data.providers);
      setNewName("");
      setNewApiKey("");
    }
  };

  const deleteProvider = async (id: string) => {
    const response = await fetch(`/api/providers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (data.success) {
      setProviders(data.providers);
      if (selectedProvider?.id === id) setSelectedProvider(null);
    }
  };

  const clearProviders = async () => {
    if (!window.confirm("Remove all imported provider connections?")) return;
    const response = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_all" }),
    });
    const data = await response.json();
    if (data.success) setProviders([]);
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const openCompatible = (kind: "openai" | "anthropic") => {
    setShowCompatible(kind);
    setCompatibleName(kind === "openai" ? "OpenAI Compatible" : "Anthropic Compatible");
    setCompatiblePrefix(kind === "openai" ? "openai" : "anthropic");
    setCompatibleBaseUrl(kind === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com/v1");
    setCompatibleApiKey("");
    setCompatibleModel("");
    setCompatibleStatus(null);
  };

  const createCompatible = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showCompatible || !compatibleName.trim() || !compatiblePrefix.trim() || !compatibleBaseUrl.trim()) return;
    setCompatibleStatus("Creating connection...");
    const response = await fetch("/api/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: compatiblePrefix.trim(), name: compatibleName.trim(), authType: "apikey", apiKey: compatibleApiKey, baseUrl: compatibleBaseUrl.trim(), apiType: showCompatible === "openai" ? "chat-completions" : "messages", model: compatibleModel.trim(), priority: 1 }) });
    const data = await response.json();
    if (!data.success) { setCompatibleStatus(data.error || "Create failed"); return; }
    setProviders(data.providers);
    setCompatibleStatus("Connection created");
    setTimeout(() => setShowCompatible(null), 700);
  };

  return (
    <div className="grid-bg min-h-screen bg-[#09090b] text-zinc-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-zinc-950">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-emerald-400/30 bg-emerald-400/10 font-mono text-sm font-bold text-emerald-300 shadow-[0_0_16px_-4px_rgba(57,217,138,0.5)]">S</span>
              <span className="font-semibold tracking-tight text-white">SotaRouter</span>
            </Link>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:block">Control plane</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] text-emerald-300 sm:inline-flex">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Gateway online
            </span>
            <button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]">
              <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import connections</span><span className="sm:hidden">Import</span>
            </button>
            <button type="button" className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white" aria-label="Settings"><Settings2 className="h-4 w-4" /></button>
          </div>
        </div>

        <div className={`border-t border-zinc-800/70 lg:hidden ${mobileMenu ? "block" : "hidden"}`}>
          <nav className="mx-auto flex max-w-[1360px] gap-6 overflow-x-auto px-4 sm:px-6" aria-label="Dashboard sections">
            <TabButton active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setMobileMenu(false); }}><Activity className="h-3.5 w-3.5" /> Overview</TabButton>
            <TabButton active={activeTab === "endpoint"} onClick={() => { setActiveTab("endpoint"); setMobileMenu(false); }}><Code2 className="h-3.5 w-3.5" /> Endpoint</TabButton>
            <TabButton active={activeTab === "providers"} onClick={() => { setActiveTab("providers"); setMobileMenu(false); }}><Server className="h-3.5 w-3.5" /> Providers <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{providers.length}</span></TabButton>
            <TabButton active={activeTab === "analytics"} onClick={() => { setActiveTab("analytics"); setMobileMenu(false); }}><Coins className="h-3.5 w-3.5" /> Analytics</TabButton>
            <TabButton active={activeTab === "logs"} onClick={() => { setActiveTab("logs"); setMobileMenu(false); }}><Terminal className="h-3.5 w-3.5" /> Live logs</TabButton>
          </nav>
        </div>
      </header>

      <aside className="fixed inset-y-16 left-0 z-30 hidden w-64 border-r border-zinc-800/80 bg-[#09090b] px-4 py-6 lg:block"><p className="px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Control plane</p><nav className="mt-4 space-y-1" aria-label="Primary navigation"><Link href="/dashboard" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${activeTab === "overview" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-white"}`}><Activity className="h-4 w-4" /> Overview</Link><Link href="/dashboard/endpoint" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Code2 className="h-4 w-4" /> Endpoint</Link><Link href="/dashboard/providers" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Server className="h-4 w-4" /> Providers <span className="ml-auto rounded bg-zinc-800 px-1.5 py-0.5 text-[10px]">{providers.length}</span></Link><Link href="/dashboard/token-saver" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Zap className="h-4 w-4" /> Token Saver</Link><Link href="/dashboard/cli-tools" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Terminal className="h-4 w-4" /> CLI Tools</Link><button type="button" onClick={() => setActiveTab("analytics")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Coins className="h-4 w-4" /> Analytics</button><button type="button" onClick={() => setActiveTab("logs")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"><Terminal className="h-4 w-4" /> Live logs</button></nav></aside>
+
+      <main id="main-content" className="mx-auto max-w-[1360px] px-4 py-7 sm:px-6 lg:ml-64 lg:px-8 lg:py-10">
        {activeTab === "overview" && (
          <div className="rise-in space-y-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Gateway overview</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Good evening, router is ready.</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">One place to watch traffic, provider health, and spend across your model connections.</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600"><RefreshCw className="h-3.5 w-3.5" /> Updated just now</div>
            </div>

            <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]" aria-label="Gateway status">
              <article className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(26,64,48,.72),rgba(17,17,20,.96)_62%)] p-6 sm:p-8">
                <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-emerald-300/10" />
                <div className="absolute -right-5 -top-9 h-40 w-40 rounded-full border border-emerald-300/10" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="eyebrow text-emerald-300/80">Primary gateway</span>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">SotaRouter engine</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Healthy</span>
                  </div>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50/60">Requests are routed through healthy pools with streaming enabled and automatic cooldown on provider errors.</p>
                  <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">n/a</div><div className="mt-1 text-xs text-emerald-100/50">Gateway benchmark not connected</div></div>
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">{providers.length}</div><div className="mt-1 text-xs text-emerald-100/50">imported connections</div></div>
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">n/a</div><div className="mt-1 text-xs text-emerald-100/50">active streams not connected</div></div>
                  </div>
                </div>
              </article>

              <article className="surface rounded-2xl p-6">
                <div className="flex items-center justify-between"><span className="eyebrow">Endpoint</span><Code2 className="h-4 w-4 text-zinc-600" /></div>
                <div className="mt-5 flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-amber-400" /><code className="font-mono text-lg text-white">Not connected</code></div>
                <p className="mt-3 text-sm leading-6 text-zinc-500">The OpenAI-compatible data plane is not connected yet. Configure it from Endpoint.</p>
                <div className="mt-6 flex flex-wrap gap-2"><span className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[10px] text-zinc-500">/v1/chat/completions</span><span className="rounded-md border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 font-mono text-[10px] text-amber-300">SSE pending</span></div>
              </article>
            </section>

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Key metrics">
              <Metric label="Requests, 24h" value="n/a" detail="Gateway not connected" icon={Zap} />
              <Metric label="Tokens routed" value="n/a" detail="Usage ledger not connected" icon={Database} />
              <Metric label="Estimated spend" value="n/a" detail="Usage ledger not connected" icon={Coins} />
              <Metric label="Memory footprint" value="n/a" detail="Data plane not connected" icon={Layers3} />
            </section>

            <section className="surface rounded-2xl" aria-labelledby="recent-activity-title">
              <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="eyebrow">Request stream</p><h2 id="recent-activity-title" className="mt-1 text-lg font-semibold text-white">Recent activity</h2></div>
                <button type="button" onClick={() => setActiveTab("logs")} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">Open live logs <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              <div className="px-5 py-10 text-center sm:px-6"><p className="text-sm text-zinc-500">No request activity yet.</p><p className="mt-1 text-xs text-zinc-700">Connect the data plane to populate live logs.</p></div>
            </section>
          </div>
        )}

        {activeTab === "endpoint" && (
          <div className="rise-in space-y-7">
            <div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Gateway active</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Endpoint & key access.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Unified OpenAI & Anthropic compatible interface. Auto-failover and smart pool are active on port :3300.</p></div>
            <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
              <article className="surface rounded-2xl p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Primary endpoint</p><h2 className="mt-2 font-mono text-xl text-white">http://127.0.0.1:3300/v1</h2></div><span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Engine live</span></div>
                <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5"><div><h3 className="text-sm font-medium text-white">Gateway engine</h3><p className="mt-1 text-xs text-zinc-600">Ultra-low latency Go daemon listening on :3300.</p></div><span className="h-6 w-11 rounded-full border border-emerald-500/40 bg-emerald-950 p-1"><span className="block h-4 w-4 translate-x-5 rounded-full bg-emerald-400 transition-transform" /></span></div>
                <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-5"><div><h3 className="text-sm font-medium text-white">Auto failover & cooldown</h3><p className="mt-1 text-xs text-zinc-600">Automatic 60s cooldown on 429/5xx with seamless rotation.</p></div><span className="h-6 w-11 rounded-full border border-emerald-500/40 bg-emerald-950 p-1"><span className="block h-4 w-4 translate-x-5 rounded-full bg-emerald-400 transition-transform" /></span></div>
              </article>
              <article className="surface rounded-2xl p-6 sm:p-7"><p className="eyebrow">Authentication</p><div className="mt-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Active</h2><p className="mt-1 text-xs text-zinc-600">Protected by SOTA_GATEWAY_KEY or transparent mode.</p></div><ShieldCheck className="h-5 w-5 text-emerald-400" /></div><div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">Pool capacity</span><span className="font-mono text-[10px] text-emerald-400 font-bold">{providers.length} providers loaded</span></div><p className="mt-4 text-sm text-zinc-400">All providers synced directly with engine pool.</p></div></article>
            </section>
            <section className="surface rounded-2xl p-6 sm:p-7"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-400"><Terminal className="h-4 w-4" /></span><div><p className="eyebrow">Request base</p><h2 className="mt-1 text-base font-semibold text-white">Production Gateway Endpoints</h2></div></div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div><code className="font-mono text-xs text-emerald-300">http://127.0.0.1:3300/v1/chat/completions</code><p className="mt-2 text-xs text-zinc-500">OpenAI format compatible with real-time SSE streaming & token rotation.</p></div><span className="shrink-0 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-emerald-300">SSE Ready</span></div></section>
          </div>
        )}

        {activeTab === "providers" && (
          <div className="rise-in space-y-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="eyebrow">Provider connections</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Your routing pool.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Import exported 9Router connections or add a provider manually. Credentials are accepted for routing, then redacted from every public response.</p></div>
              <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]"><FileJson className="h-4 w-4" /> Import JSON</button><button type="button" onClick={clearProviders} disabled={!providers.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-400 transition hover:border-rose-400/30 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /> Clear pool</button></div>
            </div>

            <div className="surface flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input aria-label="Search providers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search provider, account, or auth type" className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/50" /></div><div className="flex items-center gap-2 px-2 font-mono text-[11px] text-zinc-600"><span>{filteredProviders.length} shown</span><span>·</span><span>{loading ? "syncing" : "synced"}</span></div></div>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Custom Providers</p><h2 className="mt-1 text-lg font-semibold text-white">OpenAI / Anthropic compatible</h2><p className="mt-1 text-sm text-zinc-600">Bring any compatible endpoint through manual connection JSON.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => openCompatible("openai")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-emerald-400/30 hover:text-emerald-300">Add OpenAI Compatible</button><button type="button" onClick={() => openCompatible("anthropic")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-emerald-400/30 hover:text-emerald-300">Add Anthropic Compatible</button></div></div>
              {filteredProviders.filter((provider) => provider.authType !== "oauth").length === 0 ? <div className="surface rounded-2xl border-dashed p-8 text-center"><h3 className="text-sm font-medium text-zinc-300">No custom providers</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">Import a providerConnections export or add a compatible endpoint below.</p><button type="button" onClick={() => setShowImport(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"><Upload className="h-4 w-4" /> Import provider</button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredProviders.filter((provider) => provider.authType !== "oauth").map((provider) => <ProviderCard key={provider.id} provider={provider} onInspect={setSelectedProvider} onDelete={deleteProvider} />)}</div>}
            </section>
            <section className="space-y-4"><div><p className="eyebrow">OAuth Providers</p><h2 className="mt-1 text-lg font-semibold text-white">Managed provider catalog</h2><p className="mt-1 text-sm text-zinc-600">Dedicated provider control panels with test surfaces & models.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Antigravity", "Claude", "Genspark", "NARAROUTER"].map((name) => <article key={name} className="surface rounded-xl p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs font-semibold text-zinc-300">{name.slice(0, 2)}</span><div><h3 className="text-sm font-medium text-white">{name}</h3><p className="mt-1 font-mono text-[10px] uppercase text-zinc-600">OAuth catalog</p></div></div><span className="h-2 w-2 rounded-full bg-emerald-400" /></div>{name === "Antigravity" ? <Link href="/dashboard/providers/antigravity" className="mt-4 block w-full text-center rounded-lg bg-zinc-900 border border-emerald-500/30 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-400/10">Manage & Test Models →</Link> : <button type="button" onClick={() => setShowImport(true)} className="mt-4 w-full rounded-lg border border-zinc-800 py-2 text-xs font-medium text-zinc-400 hover:border-emerald-400/30 hover:text-emerald-300">Import connection</button>}</article>)}</div></section>
            <section className="surface rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-400"><Plus className="h-4 w-4" /></span><div><p className="eyebrow">Manual connection</p><h2 className="mt-1 text-base font-semibold text-white">Add one provider</h2></div></div><form onSubmit={addProvider} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.4fr_100px_auto] lg:items-end"><label className="text-xs text-zinc-500">Provider type<input value={newProviderType} onChange={(event) => setNewProviderType(event.target.value)} placeholder="antigravity, openai" className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Name or account<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="team@domain.com" className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Secret<input type="password" value={newApiKey} onChange={(event) => setNewApiKey(event.target.value)} placeholder="sk-..." className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Priority<input type="number" min="1" max="100" value={newPriority} onChange={(event) => setNewPriority(Number(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><button type="submit" className="h-10 rounded-lg bg-emerald-400 px-5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]">Add provider</button></form></section>

            <section className="surface rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-400"><Plus className="h-4 w-4" /></span><div><p className="eyebrow">Manual connection</p><h2 className="mt-1 text-base font-semibold text-white">Add one provider</h2></div></div><form onSubmit={addProvider} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.4fr_100px_auto] lg:items-end"><label className="text-xs text-zinc-500">Provider type<input value={newProviderType} onChange={(event) => setNewProviderType(event.target.value)} placeholder="antigravity, openai" className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Name or account<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="team@domain.com" className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Secret<input type="password" value={newApiKey} onChange={(event) => setNewApiKey(event.target.value)} placeholder="sk-..." className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><label className="text-xs text-zinc-500">Priority<input type="number" min="1" max="100" value={newPriority} onChange={(event) => setNewPriority(Number(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" /></label><button type="submit" className="h-10 rounded-lg bg-emerald-400 px-5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]">Add provider</button></form></section>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="rise-in space-y-7">
            <div><p className="eyebrow">Usage intelligence</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Tokens and spend.</h1><p className="mt-2 text-sm leading-6 text-zinc-500">A compact view of the traffic your gateway has routed.</p></div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Input tokens" value="19.1M" detail="Across 173 requests" icon={Database} /><Metric label="Cached tokens" value="16.3M" detail="85.3% cache ratio" icon={Zap} tone="good" /><Metric label="Output tokens" value="76.9k" detail="Avg 445 / request" icon={Activity} /><Metric label="Estimated spend" value="$12.55" detail="Current reporting window" icon={Coins} tone="good" /></div>
            <section className="surface rounded-2xl p-5 sm:p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><p className="eyebrow">Traffic volume</p><h2 className="mt-1 text-lg font-semibold text-white">Token consumption</h2></div><span className="font-mono text-[11px] text-zinc-600">Last 24 hours · UTC</span></div><div className="mt-7 overflow-hidden"><svg viewBox="0 0 736 150" className="h-48 w-full min-w-[620px]" role="img" aria-label="Token consumption trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39d98a" stopOpacity=".22" /><stop offset="1" stopColor="#39d98a" stopOpacity="0" /></linearGradient></defs><path d={`M ${chartPoints} L 736 150 L 0 150 Z`} fill="url(#fill)" /><path d={`M ${chartPoints}`} fill="none" stroke="#39d98a" strokeWidth="2" vectorEffect="non-scaling-stroke" /><line x1="0" y1="149" x2="736" y2="149" stroke="#29292f" /><line x1="0" y1="75" x2="736" y2="75" stroke="#29292f" strokeDasharray="3 6" /><line x1="0" y1="1" x2="736" y2="1" stroke="#29292f" strokeDasharray="3 6" /></svg><div className="flex justify-between font-mono text-[10px] text-zinc-600"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span></div></div></section>
            <section className="surface overflow-hidden rounded-2xl"><div className="border-b border-zinc-800 px-5 py-5 sm:px-6"><p className="eyebrow">Cost allocation</p><h2 className="mt-1 text-lg font-semibold text-white">By model</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-zinc-950/70 font-mono text-[10px] uppercase tracking-wide text-zinc-600"><tr><th className="px-5 py-3 sm:px-6">Model</th><th className="px-5 py-3">Requests</th><th className="px-5 py-3">Input</th><th className="px-5 py-3">Output</th><th className="px-5 py-3 text-right sm:px-6">Spend</th></tr></thead><tbody className="divide-y divide-zinc-800/80">{modelStats.map((row) => <tr key={row.model} className="text-zinc-400"><td className="px-5 py-4 font-medium text-zinc-200 sm:px-6">{row.model}</td><td className="px-5 py-4 font-mono">{row.requests}</td><td className="px-5 py-4 font-mono">{row.input}</td><td className="px-5 py-4 font-mono">{row.output}</td><td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400 sm:px-6">{row.cost}</td></tr>)}</tbody></table></div></section>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="rise-in space-y-7"><div><p className="eyebrow">Observability</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Live request logs.</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Inspect routing decisions, provider response time, and failover events.</p></div><section className="surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span><span className="font-mono text-xs text-emerald-300">Stream connected</span></div><button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="More log options"><MoreHorizontal className="h-4 w-4" /></button></div><div className="divide-y divide-zinc-800/80">{recentLogs.concat([{ id: "req_5", time: "23:32:15", model: "gemini-3.6-flash-high", provider: "Gemini pool · failover", input: "88.4k", output: "712", cost: "$0.041", status: 200 }]).map((log) => <div key={log.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className={`h-2 w-2 shrink-0 rounded-full ${log.provider.includes("failover") ? "bg-amber-400" : "bg-emerald-400"}`} /><div className="min-w-0"><div className="truncate font-mono text-xs text-zinc-200">POST /v1/chat/completions</div><div className="mt-1 truncate text-xs text-zinc-600">{log.model} · {log.provider}</div></div></div><div className="flex items-center gap-4 pl-5 font-mono text-[11px] text-zinc-500 sm:pl-0"><span>{log.time}</span><span>TTFB 11ms</span><span className="text-emerald-400">{log.status}</span></div></div>)}</div></section></div>
        )}
      </main>

      <footer className="border-t border-zinc-800/80 px-4 py-5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-700">SotaRouter · Go data plane · Next.js control plane</footer>

      {showCompatible && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={createCompatible} className="surface w-full max-w-xl rounded-2xl p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between border-b border-zinc-800 pb-5"><div><p className="eyebrow text-emerald-300">Custom provider</p><h2 className="mt-2 text-xl font-semibold text-white">Add {showCompatible === "openai" ? "OpenAI" : "Anthropic"} Compatible</h2><p className="mt-1 text-sm text-zinc-500">Configure a compatible API endpoint.</p></div><button type="button" onClick={() => setShowCompatible(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Close compatible provider dialog"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-zinc-500 sm:col-span-2">Name<input required value={compatibleName} onChange={(e) => setCompatibleName(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-emerald-400/50" placeholder="OpenAI Compatible (Prod)" /></label><label className="text-xs text-zinc-500">Prefix<input required value={compatiblePrefix} onChange={(e) => setCompatiblePrefix(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" placeholder="oc-prod" /></label><label className="text-xs text-zinc-500">API Type<select value={showCompatible === "openai" ? "chat-completions" : "messages"} disabled className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300"><option>{showCompatible === "openai" ? "Chat Completions" : "Messages"}</option></select></label><label className="text-xs text-zinc-500 sm:col-span-2">Base URL<input required type="url" value={compatibleBaseUrl} onChange={(e) => setCompatibleBaseUrl(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" placeholder="https://api.openai.com/v1" /><span className="mt-1 block text-[10px] text-zinc-600">Used for model and completion routing.</span></label><label className="text-xs text-zinc-500 sm:col-span-2">API Key (for Check)<input type="password" value={compatibleApiKey} onChange={(e) => setCompatibleApiKey(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" placeholder="sk-..." /></label><label className="text-xs text-zinc-500 sm:col-span-2">Model ID <span className="text-zinc-700">(optional)</span><input value={compatibleModel} onChange={(e) => setCompatibleModel(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/50" placeholder="e.g. gpt-4, claude-3-opus" /></label></div>{compatibleStatus && <p role="status" className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">{compatibleStatus}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCompatible(null)} className="min-h-10 rounded-lg px-4 text-xs text-zinc-400 hover:bg-zinc-800">Cancel</button><button type="button" onClick={() => setCompatibleStatus("Check endpoint is not connected yet") } className="min-h-10 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Check</button><button type="submit" className="min-h-10 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Create</button></div></form></div>}
+
{showImport && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowImport(false);
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <p className="eyebrow text-emerald-300">Data Transfer</p>
          <h2 id="import-title" className="mt-2 text-xl font-semibold text-white">
            Import from 9Router Backup
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Upload file backup <code className="font-mono text-zinc-300">.json</code> / <code className="font-mono text-zinc-300">.sqlite</code> atau paste JSON.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowImport(false)}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          aria-label="Close import dialog"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="mt-5 flex gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setImportMode("file")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            importMode === "file" ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Upload File (.json / .txt)
        </button>
        <button
          type="button"
          onClick={() => setImportMode("paste")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            importMode === "paste" ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30" : "text-zinc-400 hover:text-white"
          }`}
        >
          <FileJson className="h-3.5 w-3.5" /> Paste Raw JSON
        </button>
      </div>

      {importMode === "file" ? (
        <div className="mt-5">
          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center transition hover:border-emerald-400/40 cursor-pointer">
            <Upload className="h-8 w-8 text-zinc-500 mb-2" />
            <span className="text-sm font-medium text-zinc-200">Klik untuk pilih file backup</span>
            <span className="text-xs text-zinc-500 mt-1">Mendukung backup export JSON dari 9Router</span>
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
                    setImportStatus(`File "${file.name}" loaded (${(file.size / 1024).toFixed(1)} KB). Klik tombol Import sekarang.`);
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
          onChange={(event) => setJsonInput(event.target.value)}
          rows={9}
          placeholder='[{"id":"...","provider":"antigravity","authType":"oauth","data":{...}}]'
          className="mt-4 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/60"
        />
      )}

      {importStatus && (
        <p
          role="status"
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
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void importJson()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
        >
          <Upload className="h-3.5 w-3.5" /> Start Import
        </button>
      </div>
    </section>
  </div>
)}

      {selectedProvider && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProvider(null); }}><section role="dialog" aria-modal="true" aria-labelledby="payload-title" className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5"><div><p className="eyebrow">Connection payload</p><h2 id="payload-title" className="mt-2 text-xl font-semibold uppercase text-white">{selectedProvider.provider}</h2><p className="mt-1 text-sm text-zinc-500">{selectedProvider.name || selectedProvider.email || selectedProvider.id}</p></div><button type="button" onClick={() => setSelectedProvider(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Close payload dialog"><X className="h-5 w-5" /></button></div><pre className="mt-5 max-h-[55vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">{JSON.stringify(selectedProvider, null, 2)}</pre><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => void copyText(JSON.stringify(selectedProvider, null, 2), "payload")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 hover:bg-zinc-800">{copied === "payload" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}{copied === "payload" ? "Copied" : "Copy JSON"}</button><button type="button" onClick={() => setSelectedProvider(null)} className="min-h-10 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Close</button></div></section></div>}
    </div>
  );
}

export default Dashboard;
