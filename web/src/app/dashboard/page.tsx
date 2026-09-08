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
  Settings2,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Tab = "overview" | "providers" | "analytics" | "logs";
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newProviderType, setNewProviderType] = useState("openai");
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newPriority, setNewPriority] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/providers", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { success?: boolean; providers?: Provider[] }) => {
        if (!cancelled && data.success && data.providers) setProviders(data.providers);
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-zinc-950">Skip to content</a>

      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-emerald-400/30 bg-emerald-400/10 font-mono text-sm font-bold text-emerald-300">S</span>
              <span className="font-semibold tracking-tight text-white">SotaRouter</span>
            </Link>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:block">Control plane</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] text-emerald-300 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Gateway online
            </span>
            <button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]">
              <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import connections</span><span className="sm:hidden">Import</span>
            </button>
            <button type="button" className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white" aria-label="Settings"><Settings2 className="h-4 w-4" /></button>
          </div>
        </div>

        <div className={`border-t border-zinc-800/70 lg:block ${mobileMenu ? "block" : "hidden"}`}>
          <nav className="mx-auto flex max-w-[1360px] gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Dashboard sections">
            <TabButton active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); setMobileMenu(false); }}><Activity className="h-3.5 w-3.5" /> Overview</TabButton>
            <TabButton active={activeTab === "providers"} onClick={() => { setActiveTab("providers"); setMobileMenu(false); }}><Server className="h-3.5 w-3.5" /> Providers <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{providers.length}</span></TabButton>
            <TabButton active={activeTab === "analytics"} onClick={() => { setActiveTab("analytics"); setMobileMenu(false); }}><Coins className="h-3.5 w-3.5" /> Analytics</TabButton>
            <TabButton active={activeTab === "logs"} onClick={() => { setActiveTab("logs"); setMobileMenu(false); }}><Terminal className="h-3.5 w-3.5" /> Live logs</TabButton>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1360px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
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
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">1.14<span className="ml-1 text-sm text-emerald-200/60">ms</span></div><div className="mt-1 text-xs text-emerald-100/50">P99 gateway overhead</div></div>
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">17<span className="ml-1 text-sm text-emerald-200/60">/ 18</span></div><div className="mt-1 text-xs text-emerald-100/50">connections available</div></div>
                    <div><div className="font-mono text-3xl font-semibold tracking-tight text-white">42</div><div className="mt-1 text-xs text-emerald-100/50">active streams</div></div>
                  </div>
                </div>
              </article>

              <article className="surface rounded-2xl p-6">
                <div className="flex items-center justify-between"><span className="eyebrow">Endpoint</span><Code2 className="h-4 w-4 text-zinc-600" /></div>
                <div className="mt-5 flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-400" /><code className="font-mono text-lg text-white">localhost:8080</code></div>
                <p className="mt-3 text-sm leading-6 text-zinc-500">OpenAI-compatible routing surface for chat, messages, and streaming requests.</p>
                <div className="mt-6 flex flex-wrap gap-2"><span className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[10px] text-zinc-400">/v1/chat/completions</span><span className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[10px] text-zinc-400">SSE enabled</span></div>
              </article>
            </section>

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Key metrics">
              <Metric label="Requests, 24h" value="142,890" detail="+12.4% from yesterday" icon={Zap} tone="good" />
              <Metric label="Tokens routed" value="22.4M" detail="19.1M input · 76.9k output" icon={Database} />
              <Metric label="Estimated spend" value="$12.55" detail="Across 173 requests" icon={Coins} tone="good" />
              <Metric label="Memory footprint" value="21.4 MB" detail="42 goroutines active" icon={Layers3} />
            </section>

            <section className="surface rounded-2xl" aria-labelledby="recent-activity-title">
              <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="eyebrow">Request stream</p><h2 id="recent-activity-title" className="mt-1 text-lg font-semibold text-white">Recent activity</h2></div>
                <button type="button" onClick={() => setActiveTab("logs")} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">Open live logs <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              <div className="divide-y divide-zinc-800/80">
                {recentLogs.map((log) => <div key={log.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" /><div className="min-w-0"><div className="truncate text-sm font-medium text-zinc-200">{log.model}</div><div className="mt-1 text-xs text-zinc-600">{log.provider} · {log.time}</div></div></div><div className="flex items-center gap-4 pl-5 font-mono text-[11px] text-zinc-500 sm:pl-0"><span>in {log.input}</span><span>out {log.output}</span><span className="text-emerald-400">{log.cost}</span><span className="hidden rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300 sm:inline">{log.status}</span></div></div>)}
              </div>
            </section>
          </div>
        )}

        {activeTab === "providers" && (
          <div className="rise-in space-y-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="eyebrow">Provider connections</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Your routing pool.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Import exported 9Router connections or add a provider manually. Credentials stay in the payload you provide.</p></div>
              <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setShowImport(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[.98]"><FileJson className="h-4 w-4" /> Import JSON</button><button type="button" onClick={clearProviders} disabled={!providers.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-400 transition hover:border-rose-400/30 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /> Clear pool</button></div>
            </div>

            <div className="surface flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input aria-label="Search providers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search provider, account, or auth type" className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-200 outline-none transition focus:border-emerald-400/50" /></div><div className="flex items-center gap-2 px-2 font-mono text-[11px] text-zinc-600"><span>{filteredProviders.length} shown</span><span>·</span><span>{loading ? "syncing" : "synced"}</span></div></div>

            {providers.length === 0 ? <div className="surface rounded-2xl p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-600"><Server className="h-6 w-6" /></div><h2 className="mt-5 text-lg font-semibold text-white">No connections yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Paste the exported <code className="font-mono text-zinc-300">providerConnections</code> JSON from 9Router. SotaRouter will normalize the records into this workspace.</p><button type="button" onClick={() => setShowImport(true)} className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"><Upload className="h-4 w-4" /> Paste JSON</button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredProviders.map((provider) => <article key={provider.id} className="surface group flex min-h-[210px] flex-col justify-between rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-600">
              <div><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs font-semibold uppercase text-zinc-200 transition group-hover:border-emerald-400/30 group-hover:text-emerald-300">{provider.provider.slice(0, 2)}</div><div className="min-w-0"><h2 className="truncate text-sm font-semibold uppercase tracking-tight text-white">{provider.provider}</h2><p className="mt-1 truncate text-xs text-zinc-500">{provider.name || provider.email || provider.id}</p></div></div><StatusPill status={provider.testStatus} error={provider.lastError} /></div>{provider.lastError && <p className="mt-4 truncate rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 font-mono text-[10px] text-amber-300">{provider.lastError}</p>}<div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4 font-mono text-[11px]"><div><span className="block text-zinc-600">Auth</span><strong className="mt-1 block uppercase text-zinc-300">{provider.authType || "apikey"}</strong></div><div><span className="block text-zinc-600">Priority</span><strong className="mt-1 block text-emerald-400">{provider.priority || 1}</strong></div></div><div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px]"><span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-500">{provider.modelLocks?.length ?? 0} model locks</span>{(provider.backoffLevel ?? 0) > 0 && <span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-amber-300">backoff {provider.backoffLevel}</span>}{provider.errorCode && <span className="rounded border border-rose-400/20 bg-rose-400/5 px-2 py-1 text-rose-300">{provider.errorCode}</span>}</div></div>
              <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-3"><button type="button" onClick={() => setSelectedProvider(provider)} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">Inspect payload <ArrowUpRight className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteProvider(provider.id)} className="rounded-md p-1.5 text-zinc-600 transition hover:bg-rose-400/10 hover:text-rose-300" aria-label={`Delete ${provider.provider} connection`}><Trash2 className="h-4 w-4" /></button></div>
            </article>)}</div>}

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

      {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowImport(false); }}><section role="dialog" aria-modal="true" aria-labelledby="import-title" className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5"><div><p className="eyebrow text-emerald-300">Manual transfer</p><h2 id="import-title" className="mt-2 text-xl font-semibold text-white">Import provider connections</h2><p className="mt-1 text-sm text-zinc-500">Paste the exported 9Router <code className="font-mono text-zinc-300">providerConnections</code> JSON.</p></div><button type="button" onClick={() => setShowImport(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Close import dialog"><X className="h-5 w-5" /></button></div><textarea autoFocus value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} rows={11} placeholder='[{"id":"...","provider":"antigravity","authType":"oauth","data":{...}}]' className="mt-5 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-200 outline-none focus:border-emerald-400/60" />{importStatus && <p role="status" className={`mt-3 rounded-lg border px-3 py-2 font-mono text-xs ${importStatus.startsWith("Import failed") ? "border-rose-400/20 bg-rose-400/5 text-rose-300" : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"}`}>{importStatus}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowImport(false)} className="min-h-10 rounded-lg px-4 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white">Cancel</button><button type="button" onClick={() => void importJson()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"><Upload className="h-4 w-4" /> Process JSON</button></div></section></div>}

      {selectedProvider && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProvider(null); }}><section role="dialog" aria-modal="true" aria-labelledby="payload-title" className="surface w-full max-w-2xl rounded-2xl p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5"><div><p className="eyebrow">Connection payload</p><h2 id="payload-title" className="mt-2 text-xl font-semibold uppercase text-white">{selectedProvider.provider}</h2><p className="mt-1 text-sm text-zinc-500">{selectedProvider.name || selectedProvider.email || selectedProvider.id}</p></div><button type="button" onClick={() => setSelectedProvider(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white" aria-label="Close payload dialog"><X className="h-5 w-5" /></button></div><pre className="mt-5 max-h-[55vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">{JSON.stringify(selectedProvider, null, 2)}</pre><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => void copyText(JSON.stringify(selectedProvider, null, 2), "payload")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-xs font-medium text-zinc-300 hover:bg-zinc-800">{copied === "payload" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}{copied === "payload" ? "Copied" : "Copy JSON"}</button><button type="button" onClick={() => setSelectedProvider(null)} className="min-h-10 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Close</button></div></section></div>}
    </div>
  );
}
