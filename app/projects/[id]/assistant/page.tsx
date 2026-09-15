"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AI_ROLES, type AIRole } from "../../../../lib/ai/roles";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; role: AIRole; title: string; updated_at: string };
type Action = { id: string; action_type: string; payload: Record<string, unknown>; status: string };

export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState<AIRole>("development");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);
  useEffect(() => { if (projectId) { loadConversations(); loadActions(); } }, [projectId]);

  async function loadConversations() {
    const response = await fetch(`/api/projects/${projectId}/assistant`);
    if (response.ok) setConversations(await response.json());
  }

  async function loadActions() {
    const response = await fetch(`/api/projects/${projectId}/assistant/actions`);
    if (response.ok) setActions(await response.json());
  }

  async function openConversation(item: Conversation) {
    setConversationId(item.id); setRole(item.role); setError("");
    const response = await fetch(`/api/projects/${projectId}/assistant/conversations/${item.id}`);
    const data = await response.json();
    if (response.ok) setMessages(data.messages ?? []); else setError(data.error || "Impossible de charger la conversation.");
  }

  function newConversation(nextRole = role) {
    setConversationId(null); setMessages([]); setInput(""); setError(""); setRole(nextRole);
  }

  async function decideAction(actionId: string, decision: "approve" | "reject") {
    setError("");
    const response = await fetch(`/api/projects/${projectId}/assistant/actions/${actionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Impossible de traiter l'action."); return; }
    setActions((current) => current.map((item) => item.id === actionId ? { ...item, ...data } : item));
  }

  async function sendMessage() {
    const message = input.trim();
    if (!message || loading || !projectId) return;
    setInput(""); setError(""); setMessages((current) => [...current, { role: "user", content: message }]); setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, message, conversationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur de l'assistant.");
      setConversationId(data.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
      if (Array.isArray(data.actions) && data.actions.length) setActions((current) => [...data.actions, ...current]);
      await loadConversations();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur de l'assistant."); }
    finally { setLoading(false); }
  }

  function describeAction(action: Action) {
    const p = action.payload;
    if (action.action_type === "create_document") return `Créer « ${String(p.title || "Sans titre")} »`;
    if (action.action_type === "update_document") return `Modifier le document ${String(p.documentId || "inconnu")}`;
    if (action.action_type === "update_project") return "Modifier les informations du projet";
    if (action.action_type === "create_character") return `Créer « ${String((p.fields as Record<string, unknown>)?.name || "Sans nom")} »`;
    return `Modifier le personnage ${String(p.characterId || "inconnu")}`;
  }

  return (
    <main style={{ minHeight: "100vh", padding: "28px 5vw 60px", maxWidth: 1450, margin: "0 auto" }}>
      <Link href={`/projects/${projectId}`} style={{ color: "#a1a1aa", fontSize: 14 }}>← Retour au projet</Link>
      <header style={{ margin: "35px 0 25px" }}><p style={{ color: "#d6a85f", letterSpacing: ".16em", fontSize: 11 }}>FILMFUND AFRICA · ASSISTANT IA</p><h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", margin: "10px 0" }}>Votre équipe de développement.</h1><p style={{ color: "#a1a1aa", lineHeight: 1.7, maxWidth: 800 }}>Chaque agent travaille sur les données réelles du projet. Les modifications sont proposées puis validées par vous.</p></header>
      <div style={{ display: "grid", gridTemplateColumns: "230px 220px minmax(420px, 1fr) 300px", gap: 14, alignItems: "start" }}>
        <aside style={cardStyle}><h2 style={sectionTitle}>Agents</h2><div style={{ display: "grid", gap: 7 }}>{(Object.keys(AI_ROLES) as AIRole[]).map((key) => <button key={key} onClick={() => newConversation(key)} style={{ ...roleButton, borderColor: role === key ? "#d6a85f" : "#27272a" }}><strong>{AI_ROLES[key].label}</strong><span>{AI_ROLES[key].description}</span></button>)}</div></aside>
        <aside style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={sectionTitle}>Historique</h2><button onClick={() => newConversation()} style={newButton}>+</button></div><div style={{ display: "grid", gap: 6 }}>{conversations.map((item) => <button key={item.id} onClick={() => openConversation(item)} style={{ ...historyButton, borderColor: conversationId === item.id ? "#d6a85f" : "#27272a" }}><strong>{item.title}</strong><span>{AI_ROLES[item.role].label}</span></button>)}{!conversations.length && <div style={muted}>Aucune conversation.</div>}</div></aside>
        <section style={{ ...cardStyle, minHeight: 650, display: "flex", flexDirection: "column" }}><div style={{ borderBottom: "1px solid #27272a", paddingBottom: 16 }}><strong>{AI_ROLES[role].label}</strong><div style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>{conversationId ? "Conversation enregistrée" : "Nouvelle conversation"}</div></div><div style={{ flex: 1, padding: "20px 0", display: "grid", gap: 14, alignContent: "start" }}>{!messages.length && <div style={{ color: "#71717a", textAlign: "center", padding: 60 }}>Ex. « Génère une note d'intention à partir du concept actuel. »</div>}{messages.map((item, index) => <div key={index} style={{ justifySelf: item.role === "user" ? "end" : "start", maxWidth: "88%", padding: "13px 16px", borderRadius: 10, background: item.role === "user" ? "#1d1d24" : "#121217", border: "1px solid #27272a", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{item.content}</div>)}{loading && <div style={{ color: "#71717a", padding: 10 }}>L'agent analyse le projet…</div>}</div>{error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{error}</div>}<div style={{ display: "flex", gap: 10 }}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Demandez une analyse ou une modification…" rows={3} style={inputStyle} /><button onClick={sendMessage} disabled={loading || !input.trim()} style={sendButton}>{loading ? "…" : "Envoyer"}</button></div></section>
        <aside style={cardStyle}><h2 style={sectionTitle}>Actions proposées</h2><p style={{ ...muted, marginBottom: 14 }}>Les changements générés par l'IA attendent votre validation.</p><div style={{ display: "grid", gap: 10 }}>{actions.filter((item) => item.status === "proposed").map((action) => <div key={action.id} style={actionCard}><strong style={{ fontSize: 11, letterSpacing: ".06em" }}>{action.action_type}</strong><div style={{ fontSize: 13, margin: "7px 0 12px", lineHeight: 1.45 }}>{describeAction(action)}</div><div style={{ display: "flex", gap: 7 }}><button onClick={() => decideAction(action.id, "approve")} style={approveButton}>Appliquer</button><button onClick={() => decideAction(action.id, "reject")} style={rejectButton}>Refuser</button></div></div>)}{!actions.some((item) => item.status === "proposed") && <div style={{ color: "#52525b", fontSize: 12, padding: "25px 0" }}>Aucune modification en attente.</div>}</div></aside>
      </div>
    </main>
  );
}

const cardStyle = { border: "1px solid #27272a", background: "#0f0f13", borderRadius: 10, padding: 16 };
const sectionTitle = { fontSize: 13, margin: "0 0 12px" };
const roleButton = { textAlign: "left" as const, display: "grid", gap: 4, padding: 10, border: "1px solid", background: "#121217", color: "#e4e4e7", borderRadius: 8, cursor: "pointer" };
const historyButton = { textAlign: "left" as const, display: "grid", gap: 4, padding: 9, border: "1px solid", background: "#121217", color: "#e4e4e7", borderRadius: 7, cursor: "pointer", overflow: "hidden" };
const newButton = { width: 25, height: 25, border: "1px solid #3f3f46", borderRadius: 6, background: "transparent", color: "#d6a85f", cursor: "pointer" };
const muted = { color: "#71717a", fontSize: 12, lineHeight: 1.5 };
const inputStyle = { flex: 1, resize: "none" as const, background: "#09090b", border: "1px solid #333", borderRadius: 8, padding: 12, color: "#fff", font: "inherit" };
const sendButton = { alignSelf: "stretch", padding: "0 20px", border: 0, borderRadius: 8, background: "#d6a85f", color: "#09090b", fontWeight: 700, cursor: "pointer" };
const actionCard = { border: "1px solid #27272a", background: "#121217", borderRadius: 8, padding: 12 };
const approveButton = { flex: 1, border: 0, borderRadius: 6, padding: "8px 5px", background: "#d6a85f", color: "#09090b", fontWeight: 700, cursor: "pointer" };
const rejectButton = { flex: 1, border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 5px", background: "transparent", color: "#a1a1aa", cursor: "pointer" };
