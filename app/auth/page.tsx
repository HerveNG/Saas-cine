"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          });

      if (result.error) throw result.error;

      if (mode === "signup" && !result.data.session) {
        setMessage("Compte créé. Vérifiez votre adresse e-mail avant de vous connecter.");
        return;
      }

      window.location.assign(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 460, border: "1px solid #292929", borderRadius: 10, padding: 32, background: "#0b0b0f" }}>
        <a href="/" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>FILMFUND AFRICA</a>
        <p style={{ color: "#d6a85f", letterSpacing: "0.14em", fontSize: 11, marginTop: 36 }}>ESPACE CRÉATEUR</p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.04em", margin: "8px 0 10px" }}>{mode === "signin" ? "Bon retour." : "Créer votre espace."}</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Gérez vos projets, documents et opportunités de financement depuis un espace sécurisé.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 28 }}>
          {mode === "signup" && <label style={{ display: "grid", gap: 7 }}>Nom complet<input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" style={inputStyle} /></label>}
          <label style={{ display: "grid", gap: 7 }}>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 7 }}>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} style={inputStyle} /></label>
          <button disabled={loading} type="submit" style={{ marginTop: 8, padding: "14px 18px", border: 0, borderRadius: 6, background: "#d6a85f", color: "#111", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>{loading ? "Chargement…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}</button>
        </form>

        {message && <p role="status" style={{ color: "#d6a85f", marginTop: 18, lineHeight: 1.5 }}>{message}</p>}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ marginTop: 22, background: "transparent", border: 0, color: "#a1a1aa", cursor: "pointer" }}>
          {mode === "signin" ? "Créer un compte" : "J’ai déjà un compte"}
        </button>
      </section>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#111116",
  color: "#f5f5f5",
  outline: "none",
};
