"use client";

import { useState } from "react";

export default function BillingPage() {
  const [planId, setPlanId] = useState("creator");
  const [provider, setProvider] = useState("mtn_momo_cm");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, phone, provider }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible d'initialiser le paiement.");
      setMessage(body.checkout?.message || "Paiement initialisé. Validez la demande dans votre portefeuille Mobile Money.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur de paiement."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-10 text-white md:px-10">
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/70">FILMFUND AFRICA · BILLING</p>
          <h1 className="mt-3 text-3xl font-semibold">Abonnement IA</h1>
          <p className="mt-2 text-sm text-white/45">Paiement Mobile Money Cameroun en XAF.</p>
        </header>

        {error && <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">{message}</div>}

        <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.025] p-6">
          <label className="block text-sm text-white/60">Plan<select value={planId} onChange={(e) => setPlanId(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black p-3 text-white"><option value="creator">Creator</option><option value="pro">Pro</option><option value="studio">Studio</option></select></label>
          <label className="block text-sm text-white/60">Opérateur<select value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black p-3 text-white"><option value="mtn_momo_cm">MTN MoMo</option><option value="orange_money_cm">Orange Money</option></select></label>
          <label className="block text-sm text-white/60">Numéro Mobile Money<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XXXXXXXX" className="mt-2 w-full rounded-lg border border-white/10 bg-black p-3 text-white" /></label>
          <button onClick={checkout} disabled={loading || !phone.trim()} className="w-full rounded-lg bg-amber-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">{loading ? "Initialisation…" : "Payer avec Mobile Money"}</button>
          <p className="text-xs leading-5 text-white/35">Le plan est activé uniquement après confirmation serveur du paiement. Une transaction en attente peut être vérifiée par polling si le callback opérateur n'est pas reçu.</p>
        </section>
      </div>
    </main>
  );
}
