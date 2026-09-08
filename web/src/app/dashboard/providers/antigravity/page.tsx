"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const MODELS = [
  { id: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash High", context: "1M tokens", cost: "Low" },
  { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash High", context: "1M tokens", cost: "Low" },
  { id: "claude-sonnet-4-6", name: "Claude 3.7 Sonnet (Hybrid)", context: "200k tokens", cost: "Medium" },
  { id: "claude-opus-4-6-thinking", name: "Claude 3.7 Opus Thinking", context: "200k tokens", cost: "High" },
  { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B Medium", context: "128k tokens", cost: "Low" },
];

export default function AntigravityProviderPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; latency?: number; msg?: string }>>({});

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) {
          const antigravityOnly = data.providers.filter(
            (p: Account) => p.provider.toLowerCase() === "antigravity"
          );
          setAccounts(antigravityOnly);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const runTest = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      const start = Date.now();
      const res = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "antigravity",
          model: modelId,
          prompt: "Hello, reply with 'OK' in one word.",
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Navigation / Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <Link href="/dashboard" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span>/</span>
          <Link href="/dashboard/providers" className="hover:text-white">
            Providers
          </Link>
          <span>/</span>
          <span className="text-emerald-400">Antigravity</span>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-mono font-bold text-purple-400 text-lg">
              AG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Antigravity</h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                  OAuth Managed
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Google Cloud Workspace & Antigravity token routing pool.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/providers"
              className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition"
            >
              Manage All Providers
            </Link>
          </div>
        </div>

        {/* Accounts / Connections Section (Like 9Router UI) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">OAuth Connections</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Connected accounts currently active in your key rotation pool.
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              {accounts.length} accounts configured
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-600 col-span-full">
                Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-zinc-800 text-center col-span-full">
                <p className="text-sm text-zinc-400">Belum ada akun Antigravity terhubung.</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Gunakan tombol import di dashboard untuk memasukkan koneksi dari 9Router.
                </p>
              </div>
            ) : (
              accounts.map((acc) => {
                const hasErr = acc.lastError || acc.testStatus === "unavailable";
                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-white truncate">
                          {acc.email || acc.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                          ID: {acc.id.slice(0, 12)}...
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
                        {hasErr ? "Warning" : "Active"}
                      </span>
                    </div>

                    {acc.lastError && (
                      <div className="rounded bg-rose-500/5 border border-rose-500/15 px-2.5 py-1.5 font-mono text-[10px] text-rose-300 truncate">
                        {acc.lastError}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Priority: {acc.priority}</span>
                      <span>Proxy: direct</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Model Test Panel (Like 9Router Test Surface) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Model Availability & Testing
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Trigger instant test completions across Antigravity pool models to verify health and latency.
            </p>
          </div>

          <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            {MODELS.map((m) => {
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
