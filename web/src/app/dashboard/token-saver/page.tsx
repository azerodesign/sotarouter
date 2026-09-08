"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Zap } from "lucide-react";

const settings = [
  { id: "rtk", title: "Compress tool output", subtitle: "RTK", description: "Reduce repetitive command output before it reaches the model.", options: ["Off", "Balanced", "Aggressive"] },
  { id: "headroom", title: "Compress context", subtitle: "Headroom", description: "Keep long context within the configured token budget.", options: ["Off", "Balanced", "Aggressive"] },
  { id: "caveman", title: "Compress LLM output", subtitle: "Caveman", description: "Use terse output formatting for lower response token usage.", options: ["Off", "Standard", "Ultra"] },
  { id: "ponytail", title: "Lazy senior dev", subtitle: "Ponytail", description: "Prefer the smallest working implementation. Skip unnecessary abstractions.", options: ["Off", "Standard", "Ultra"] },
];

export default function TokenSaverPage() {
  const [values, setValues] = useState<Record<string, string>>({ rtk: "Balanced", headroom: "Balanced", caveman: "Ultra", ponytail: "Ultra" });
  return <main className="min-h-screen bg-[#09090b] px-4 py-8 text-zinc-100 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <header className="mt-10 border-b border-zinc-800 pb-7"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400">Token Saver</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Spend less context.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Configure output compression and concise coding behavior for this control-plane session.</p></header>
      <section className="mt-7 space-y-3">{settings.map((setting) => <article key={setting.id} className="rounded-2xl border border-zinc-800 bg-[#111114] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><Zap className="h-4 w-4" /></span><div><h2 className="text-sm font-medium text-white">{setting.title} <span className="font-mono text-xs text-zinc-600">({setting.subtitle})</span></h2><p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">{setting.description}</p></div></div><label className="relative shrink-0"><span className="sr-only">{setting.title} mode</span><select value={values[setting.id]} onChange={(event) => setValues((current) => ({ ...current, [setting.id]: event.target.value }))} className="h-10 min-w-32 appearance-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 pr-9 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-400/60">{setting.options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-600" /></label></div></article>)}</section>
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-xs text-amber-200/70"><Check className="h-4 w-4 text-amber-300" /> Settings apply to this UI session. Durable preferences are not connected yet.</div>
    </div>
  </main>;
}
