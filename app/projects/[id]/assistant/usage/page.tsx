"use client";

import { useEffect, useState } from "react";

function fmtNumber(value: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(value)); }
function fmtCost(value: number, currency: string) { return `${value.toFixed(4)} ${currency}`; }
function label(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }

export default function AIUsagePage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(`/api/projects/${projectId}/assistant/usage`).then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "Erreur usage"); return body; }),
      fetch("/api/ai/quota").then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "Erreur quota"); return body; }),
    ]).then(([usage, currentQuota]) => { setData(usage); setQuota(currentQuota); }).catch((err) => setError(err.message));
  }, [projectId]);

  if (error) return <main className="min-h-screen bg-[#090909] p-8 text-red-300">{error}</main>;
  if (!data || !quota) return <main className="min-h-screen bg-[#090909] p-8 text-white/50">Chargement de l’usage IA…</main>;

  const t = data.totals;
  const tokenPercent = Math.min(100, Math.round((quota.usedTokens / quota.monthlyTokenLimit) * 100));
  const runPercent = Math.min(100, Math.round((quota.usedRuns / quota.monthlyRunLimit) * 100));
  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/70">FILMFUND AFRICA · AI OBSERVABILITY</p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-3xl font-semibold tracking-tight">Usage IA</h1><p className="mt-2 text-sm text-white/45">{data.project.title} · consommation et exécution des agents</p></div><a href={`/projects/${projectId}/assistant`} className="rounded-lg border border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-white/70 hover:border-amber-300/40 hover:text-white">← Assistant IA</a></div>
        </header>

        <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/60">PLAN IA</p><h2 className="mt-2 text-2xl font-semibold">{quota.planLabel}</h2><p className="mt-1 text-xs text-white/40">Quota mensuel · renouvellement automatique au début du mois.</p></div><span className={`rounded-full border px-3 py-1 text-xs ${quota.allowed ? "border-emerald-300/20 text-emerald-300" : "border-red-300/20 text-red-300"}`}>{quota.allowed ? "Quota disponible" : "Quota atteint"}</span></div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div><div className="mb-2 flex justify-between text-xs text-white/50"><span>Tokens</span><span>{fmtNumber(quota.usedTokens)} / {fmtNumber(quota.monthlyTokenLimit)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-200" style={{ width: `${tokenPercent}%` }} /></div><p className="mt-2 text-xs text-white/35">{fmtNumber(quota.remainingTokens)} tokens restants</p></div>
            <div><div className="mb-2 flex justify-between text-xs text-white/50"><span>Exécutions</span><span>{quota.usedRuns} / {quota.monthlyRunLimit}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-200" style={{ width: `${runPercent}%` }} /></div><p className="mt-2 text-xs text-white/35">{quota.remainingRuns} exécutions restantes</p></div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Exécutions', t.completed + t.failed], ['Tokens', fmtNumber(t.totalTokens)], ['Entrée', fmtNumber(t.inputTokens)], ['Sortie', fmtNumber(t.outputTokens)], ['Actions', t.actions]].map(([title, value]) => <div key={title} className="rounded-xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{title}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}</section>

        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[0.025] p-6"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Coût estimé</h2><span className="text-xs text-white/35">{data.pricing.currency}</span></div><p className="mt-5 text-4xl font-semibold text-amber-200">{fmtCost(t.cost, data.pricing.currency)}</p><p className="mt-2 text-xs text-white/40">Tarification configurée à partir de AI_INPUT_PRICE_PER_1M et AI_OUTPUT_PRICE_PER_1M.</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-white/[0.035] p-4"><p className="text-xs text-white/40">Durée cumulée</p><p className="mt-1 font-medium">{(t.durationMs / 1000).toFixed(1)} s</p></div><div className="rounded-lg bg-white/[0.035] p-4"><p className="text-xs text-white/40">Échecs</p><p className="mt-1 font-medium">{t.failed}</p></div></div></div><div className="rounded-xl border border-white/10 bg-white/[0.025] p-6"><h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Par agent</h2><div className="mt-5 space-y-3">{data.byRole.map((item: any) => <div key={item.role} className="flex items-center justify-between border-b border-white/5 pb-3"><div><p className="text-sm">{label(item.role)}</p><p className="text-xs text-white/35">{item.runs} exécution(s) · {fmtNumber(item.tokens)} tokens</p></div><span className="text-xs text-amber-200/80">{fmtCost(item.cost, data.pricing.currency)}</span></div>)}</div></div></section>

        <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6"><h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Par package</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.byPackage.map((item: any) => <div key={item.packageId} className="rounded-lg border border-white/5 bg-black/20 p-4"><p className="text-sm font-medium">{label(item.packageId)}</p><p className="mt-2 text-xs text-white/40">{item.runs} exécution(s) · {fmtNumber(item.tokens)} tokens</p><p className="mt-2 text-sm text-amber-200/80">{fmtCost(item.cost, data.pricing.currency)}</p></div>)}</div></section>

        <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]"><div className="border-b border-white/10 p-6"><h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Historique des agents</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-white/10 text-white/35"><tr><th className="px-6 py-3">Agent</th><th className="px-4 py-3">Modèle</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Durée</th><th className="px-6 py-3 text-right">Coût</th></tr></thead><tbody>{data.runs.map((run: any) => <tr key={run.id} className="border-b border-white/5"><td className="px-6 py-4">{label(run.role)}</td><td className="px-4 py-4 text-white/50">{run.model || "—"}</td><td className="px-4 py-4"><span className={run.status === 'completed' ? 'text-emerald-300' : run.status === 'failed' ? 'text-red-300' : 'text-amber-200'}>{label(run.status)}</span></td><td className="px-4 py-4 text-white/60">{fmtNumber(run.total_tokens || 0)}</td><td className="px-4 py-4 text-white/60">{run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)} s` : '—'}</td><td className="px-6 py-4 text-right text-amber-200/80">{fmtCost(run.cost.totalCost, data.pricing.currency)}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}
