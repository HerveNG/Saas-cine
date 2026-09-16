"use client";

import { useEffect, useState } from "react";

const plans = [
  { id: "free", label: "Free" },
  { id: "creator", label: "Creator" },
  { id: "pro", label: "Pro" },
  { id: "studio", label: "Studio" },
];

export default function AIPlanSettings({ params }: { params: Promise<{ id: string }> }) {
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/ai/subscription")
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "Erreur"); return body; })
      .then(setSubscription)
      .catch((err) => setError(err.message));
  }, []);

  async function changePlan(planId: string) {
    setSaving(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/ai/subscription", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Impossible de modifier le plan.");
      setSubscription((current: any) => ({ ...current, subscription: body.subscription }));
      setMessage("Plan local mis à jour. Aucun paiement n'a été déclenché.");
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/70">FILMFUND AFRICA · BILLING FOUNDATION</p>
          <h1 className="mt-3 text-3xl font-semibold">Abonnement IA</h1>
          <p className="mt-2 text-sm text-white/45">Gestion du plan et préparation de la facturation.</p>
        </header>

        {error && <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">{message}</div>}

        {subscription && (
          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Plan actuel</p>
            <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div><h2 className="text-2xl font-semibold">{subscription.plan?.label || subscription.subscription.plan_id}</h2><p className="mt-1 text-sm text-white/40">Statut : {subscription.subscription.status}</p></div>
              <a href={`/projects/${location.pathname.split("/")[2]}/assistant/usage`} className="text-xs uppercase tracking-wider text-amber-200 hover:text-amber-100">Voir l'usage IA →</a>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const current = subscription?.subscription?.plan_id === plan.id;
            return <button key={plan.id} disabled={saving || current} onClick={() => changePlan(plan.id)} className={`rounded-xl border p-5 text-left transition ${current ? "border-amber-300/40 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.025] hover:border-white/25"}`}><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Plan</p><p className="mt-3 text-xl font-semibold">{plan.label}</p><p className="mt-4 text-xs text-white/40">{current ? "Plan actif" : saving ? "Mise à jour…" : "Sélectionner"}</p></button>;
          })}
        </section>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-xs leading-6 text-white/40">Cette étape prépare l'abonnement applicatif. Elle ne déclenche actuellement aucun paiement et aucun fournisseur de paiement n'est connecté.</div>
      </div>
    </main>
  );
}
