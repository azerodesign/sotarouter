"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Terminal } from "lucide-react";

type Tool = { name: string; command: string; description: string; status: "Connected" | "Not configured" | "Not installed" | "Unknown" };
const tools: Tool[] = [
  { name: "Claude Code", command: "claude", description: "Anthropic coding agent for terminal-based repository work.", status: "Connected" },
  { name: "Hermes Agent", command: "hermes", description: "Local agent gateway and tool orchestration CLI.", status: "Not configured" },
  { name: "Cursor", command: "cursor", description: "Open the current workspace in Cursor.", status: "Not installed" },
  { name: "Cline", command: "cline", description: "Agentic coding workflow inside the editor.", status: "Not installed" },
  { name: "DeepSeek TUI", command: "deepseek", description: "Terminal interface for DeepSeek coding workflows.", status: "Unknown" },
  { name: "Devin CLI", command: "devin", description: "Command-line entry point for Devin workflows.", status: "Unknown" },
];

const statusClass: Record<Tool["status"], string> = { Connected: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", "Not configured": "border-amber-400/20 bg-amber-400/10 text-amber-300", "Not installed": "border-zinc-800 bg-zinc-950 text-zinc-500", Unknown: "border-zinc-800 bg-zinc-950 text-zinc-600" };

export default function CliToolsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 1400); };
  return <main className="min-h-screen bg-[#09090b] px-4 py-8 text-zinc-100 sm:px-6 lg:px-10"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><header className="mt-10 border-b border-zinc-800 pb-7"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400">CLI Tools</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Coding tool integrations.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">See which coding assistants are available to the local workflow. Status is a control-plane placeholder until host probing is connected.</p></header><div className="mt-6 flex flex-wrap gap-2 font-mono text-[10px] text-zinc-600"><span className="rounded-md border border-zinc-800 px-2 py-1">{tools.length} integrations</span><span className="rounded-md border border-zinc-800 px-2 py-1">{tools.filter((tool) => tool.status === "Connected").length} connected</span></div><section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tools.map((tool) => <article key={tool.command} className="rounded-2xl border border-zinc-800 bg-[#111114] p-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400"><Terminal className="h-4 w-4" /></span><div><h2 className="text-sm font-medium text-white">{tool.name}</h2><p className="mt-1 font-mono text-xs text-zinc-600">{tool.command}</p></div></div><span className={`rounded-md border px-2 py-1 font-mono text-[10px] ${statusClass[tool.status]}`}>{tool.status}</span></div><p className="mt-5 min-h-10 text-xs leading-5 text-zinc-500">{tool.description}</p><button type="button" onClick={() => void copy(tool.command)} className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">{copied === tool.command ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy command</button></article>)}</section></div></main>;
}
