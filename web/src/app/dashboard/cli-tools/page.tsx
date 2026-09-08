"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Terminal } from "lucide-react";

const tools = [
  { name: "RTK", command: "rtk", description: "Compress noisy CLI output before it enters the context window.", status: "Not connected" },
  { name: "GitHub CLI", command: "gh", description: "Manage repositories, issues, pull requests, and releases from the terminal.", status: "Not connected" },
  { name: "Docker", command: "docker", description: "Inspect and operate local container workloads.", status: "Not connected" },
  { name: "Go", command: "go", description: "Build and run the SotaRouter data plane when the toolchain is installed.", status: "Not connected" },
];

export default function CliToolsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 1400); };
  return <main className="min-h-screen bg-[#09090b] px-4 py-8 text-zinc-100 sm:px-6 lg:px-10"><div className="mx-auto max-w-4xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</Link><header className="mt-10 border-b border-zinc-800 pb-7"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400">CLI Tools</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Toolchain visibility.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Inspect the command-line tools required by the local gateway workflow.</p></header><section className="mt-7 grid gap-3 sm:grid-cols-2">{tools.map((tool) => <article key={tool.command} className="rounded-2xl border border-zinc-800 bg-[#111114] p-5"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400"><Terminal className="h-4 w-4" /></span><div><h2 className="text-sm font-medium text-white">{tool.name}</h2><p className="mt-1 font-mono text-xs text-zinc-600">{tool.command}</p></div></div><span className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-600">{tool.status}</span></div><p className="mt-5 text-xs leading-5 text-zinc-500">{tool.description}</p><button type="button" onClick={() => void copy(tool.command)} className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">{copied === tool.command ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy command</button></article>)}</section></div></main>;
}
