"use client";

import Link from "next/link";
import { useState } from "react";
import { AI_ROLES, type AIRole } from "../../../../lib/ai/roles";

export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [role, setRole] = useState<AIRole>("development");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage() {
    const id = projectId || (await params).id;
    setProjectId(id);
    const message = input.trim();
    if (!message || loading) return;
    setInput(""); setError("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${id}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur de l'assistant.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur de l'assistant."); }
    finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px 5vw 60px", maxWidth: 1250, margin: "0 auto" }}>
      <Link href={`/projects/${projectId || ""}`} style={{ color: "#a1a1aa", fontSize: 14 }}>← Retour au projet</Link>
      <header style={{ margin: "35px 0 25px" }}>
        <p style={{ color: "#d6a85f", letterSpacing: ".16em", fontSize: 11 }}>FILMFUND AFRICA · ASSISTANT IA</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", margin: "10px 0" }}>Votre équipe de développement.</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.7, maxWidth: 760 }}>Chaque rôle travaille sur les données réelles du projet : identité, vision éditoriale, personnages et documents.</p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        <aside style={cardStyle}>
          <h2 style={{ fontSize: 14, marginTop: 0 }}>Rôle de l'agent</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {(Object.keys(AI_ROLES) as AIRole[]).map((key) => <button key={key} onClick={() => setRole(key)} style={{ ...roleButton, borderColor: role === key ? "#d6a85f" : "#27272a" }}><strong>{AI_ROLES[key].label}</strong><span>{AI_ROLES[key].description}</span></button>)}
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #27272a", color: "#71717a", fontSize: 12, lineHeight: 1.6 }}>Le contexte est chargé côté serveur. La clé du fournisseur IA n'est jamais envoyée au navigateur.</div>
        </aside>
        <section style={{ ...cardStyle, minHeight: 600, display: "flex", flexDirection: "column" }}>
          <div style={{ borderBottom: "1px solid #27272a", paddingBottom: 16 }}><strong>{AI_ROLES[role].label}</strong><div style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>Agent spécialisé</div></div>
          <div style={{ flex: 1, padding: "20px 0", display: "grid", gap: 14, alignContent: "start" }}>
            {!messages.length && <div style={{ color: "#71717a", textAlign: "center", padding: 60 }}>Posez une question sur votre projet pour commencer.</div>}
            {messages.map((item, index) => <div key={index} style={{ justifySelf: item.role === "user" ? "end" : "start", maxWidth: "85%", padding: "13px 16px", borderRadius: 10, background: item.role === "user" ? "#1d1d24" : "#121217", border: "1px solid #27272a", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{item.content}</div>)}
            {loading && <div style={{ color: "#71717a", padding: 10 }}>L'agent analyse le projet…</div>}
          </div>
          {error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Ex. Analyse la logline et propose trois axes de développement…" rows={3} style={inputStyle} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={sendButton}>{loading ? "…" : "Envoyer"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}

const cardStyle = { border: "1px solid #27272a", background: "#0f0f13", borderRadius: 10, padding: 20 };
const roleButton = { textAlign: "left" as const, display: "grid", gap: 5, padding: 12, border: "1px solid", background: "#121217", color: "#e4e4e7", borderRadius: 8, cursor: "pointer" };
const inputStyle = { flex: 1, resize: "none" as const, background: "#09090b", border: "1px solid #333", borderRadius: 8, padding: 12, color: "#fff", font: "inherit" };
const sendButton = { alignSelf: "stretch", padding: "0 20px", border: 0, borderRadius: 8, background: "#d6a85f", color: "#09090b", fontWeight: 700, cursor: "pointer" };
