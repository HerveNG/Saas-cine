"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AI_ROLES, type AIRole } from "../../../../lib/ai/roles";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; role: AIRole; title: string; updated_at: string };
type Action = { id: string; action_type: string; payload: Record<string, unknown>; status: string };
type Workflow = { title: string; taskCount: number } | null;
type RuntimeTask = { id: string; task_index: number; role: AIRole; objective: string; output_label: string; status: string; output?: string | null; action_ids?: string[] };
type RuntimeWorkflow = { id: string; title: string; goal: string; status: string; current_task_index: number; tasks: RuntimeTask[] } | null;

export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState<AIRole>("development");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const [runtimeWorkflow, setRuntimeWorkflow] = useState<RuntimeWorkflow>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { params.then(({ id }) => setProjectId(id)); }, [params]);
  useEffect(() => { if (projectId) { loadConversations(); loadActions(); loadRuntimeWorkflow(); } }, [projectId]);

  async function loadConversations() { const response = await fetch(`/api/projects/${projectId}/assistant`); if (response.ok) setConversations(await response.json()); }
  async function loadActions() { const response = await fetch(`/api/projects/${projectId}/assistant/actions`); if (response.ok) setActions(await response.json()); }
  async function loadRuntimeWorkflow() {
    const response = await fetch(`/api/projects/${projectId}/assistant/workflows`);
    if (!response.ok) return;
    const data = await response.json();
    const active = data.find((item: any) => ["running", "waiting_approval"].includes(item.status));
    if (active) setRuntimeWorkflow({ ...active, tasks: active.ai_tasks ?? [] });
    else setRuntimeWorkflow((current) => current?.status === "completed" ? current : null);
  }

  async function refreshWorkflow(workflowId = runtimeWorkflow?.id) {
    if (!workflowId) return;
    const response = await fetch(`/api/projects/${projectId}/assistant/workflows/${workflowId}`);
    if (response.ok) setRuntimeWorkflow(await response.json());
  }

  async function openConversation(item: Conversation) {
    setConversationId(item.id); setRole(item.role); setError(""); setWorkflow(null);
    const response = await fetch(`/api/projects/${projectId}/assistant/conversations/${item.id}`);
    const data = await response.json();
    if (response.ok) setMessages(data.messages ?? []); else setError(data.error || "Impossible de charger la conversation.");
  }

  function newConversation(nextRole = role) { setConversationId(null); setMessages([]); setInput(""); setError(""); setWorkflow(null); setRole(nextRole); }

  async function decideAction(actionId: string, decision: "approve" | "reject") {
    setError("");
    const response = await fetch(`/api/projects/${projectId}/assistant/actions/${actionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Impossible de traiter l'action."); return; }
    await loadActions();
    await loadRuntimeWorkflow();
    if (runtimeWorkflow?.id) await refreshWorkflow(runtimeWorkflow.id);
  }

  async function startWorkflow() {
    const goal = input.trim() || "Prépare mon projet pour une recherche de financement.";
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant/workflows`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de lancer le workflow.");
      setRuntimeWorkflow({ ...data.workflow, tasks: data.tasks ?? [] });
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur du workflow."); }
    finally { setLoading(false); }
  }

  async function runWorkflow() {
    if (!runtimeWorkflow || loading || ["completed", "cancelled"].includes(runtimeWorkflow.status)) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant/workflows/${runtimeWorkflow.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "run" }) });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error || "Impossible d'exécuter la tâche.");
      if (data.workflow) setRuntimeWorkflow({ ...data.workflow, tasks: data.tasks ?? runtimeWorkflow.tasks });
      await loadActions();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur du workflow."); }
    finally { setLoading(false); }
  }

  async function cancelWorkflow() {
    if (!runtimeWorkflow || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant/workflows/${runtimeWorkflow.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "cancel" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'annuler le workflow.");
      setRuntimeWorkflow({ ...data.workflow, tasks: data.tasks ?? [] });
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur d'annulation."); }
    finally { setLoading(false); }
  }

  async function sendMessage() {
    const message = input.trim();
    if (!message || loading || !projectId) return;
    setInput(""); setError(""); setWorkflow(null); setMessages((current) => [...current, { role: "user", content: message }]); setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, message, conversationId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur de l'assistant.");
      setConversationId(data.conversationId); setWorkflow(data.workflow ?? null);
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

  const pendingActions = actions.filter((item) => item.status === "proposed");
  const completedTasks = runtimeWorkflow?.tasks.filter((task) => task.status === "completed").length ?? 0;
  const totalTasks = runtimeWorkflow?.tasks.length ?? 0;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <main style={{ minHeight: "100vh", padding: "28px 5vw 60px", maxWidth: 1500, margin: "0 auto" }}>
      <Link href={`/projects/${projectId}`} style={{ color: "#a1a1aa", fontSize: 14 }}>← Retour au projet</Link>
      <header style={{ margin: "35px 0 25px" }}><p style={{ color: "#d6a85f", letterSpacing: ".16em", fontSize: 11 }}>FILMFUND AFRICA · ASSISTANT IA</p><h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", margin: "10px 0" }}>Votre équipe de développement.</h1><p style={{ color: "#a1a1aa", lineHeight: 1.7, maxWidth: 800 }}>Chaque agent travaille sur les données réelles du projet. Les modifications sont proposées puis validées par vous.</p></header>

      {workflow && <div style={workflowBanner}><div><strong>Workflow détecté : {workflow.title}</strong><span style={{ display: "block", marginTop: 4 }}>{workflow.taskCount} tâches spécialisées seront prises en compte.</span></div><button onClick={startWorkflow} disabled={loading || Boolean(runtimeWorkflow && ["running", "waiting_approval"].includes(runtimeWorkflow.status))} style={workflowButton}>Lancer le workflow</button></div>}

      {runtimeWorkflow && <section style={runtimeBanner}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={{ color: "#d6a85f", fontSize: 11, letterSpacing: ".1em" }}>ORCHESTRATEUR</div><strong style={{ fontSize: 18 }}>{runtimeWorkflow.title}</strong><div style={muted}>{runtimeWorkflow.goal}</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={runWorkflow} disabled={loading || ["completed", "cancelled", "waiting_approval"].includes(runtimeWorkflow.status)} style={workflowButton}>{loading ? "Exécution…" : runtimeWorkflow.status === "completed" ? "Workflow terminé" : runtimeWorkflow.status === "waiting_approval" ? "Validation requise" : "Exécuter la prochaine tâche"}</button>
            {! ["completed", "cancelled"].includes(runtimeWorkflow.status) && <button onClick={cancelWorkflow} disabled={loading} style={cancelButton}>Annuler</button>}
          </div>
        </div>
        <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a1a1aa", marginBottom: 6 }}><span>{completedTasks}/{totalTasks} tâches terminées</span><span>{progress}%</span></div><div style={progressTrack}><div style={{ ...progressFill, width: `${progress}%` }} /></div></div>
        <div style={stepper}>{runtimeWorkflow.tasks.map((task) => <article key={task.id} style={stepCard(task.status)}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={stepNumber(task.status)}>{task.task_index + 1}</span><div><strong>{AI_ROLES[task.role].label}</strong><div style={{ color: "#a1a1aa", fontSize: 12 }}>{task.output_label}</div></div></div><span style={statusBadge(task.status)}>{task.status}</span></div><p style={{ ...muted, margin: "10px 0 0" }}>{task.objective}</p>{task.output && <details style={{ marginTop: 10 }} open={task.status === "waiting_approval"}><summary style={{ cursor: "pointer", color: "#d6a85f", fontSize: 12 }}>Voir le résultat</summary><div style={outputBox}>{task.output}</div></details>}{task.status === "waiting_approval" && <div style={approvalHint}>Cette étape attend la validation de {task.action_ids?.length ?? 0} action(s) proposée(s).</div>}</article>)}</div>
      </section>}

      <div style={{ display: "grid", gridTemplateColumns: "230px 220px minmax(420px, 1fr) 300px", gap: 14, alignItems: "start", marginTop: runtimeWorkflow ? 14 : 0 }}>
        <aside style={cardStyle}><h2 style={sectionTitle}>Agents</h2><div style={{ display: "grid", gap: 7 }}>{(Object.keys(AI_ROLES) as AIRole[]).map((key) => <button key={key} onClick={() => newConversation(key)} style={{ ...roleButton, borderColor: role === key ? "#d6a85f" : "#27272a" }}><strong>{AI_ROLES[key].label}</strong><span>{AI_ROLES[key].description}</span></button>)}</div></aside>
        <aside style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={sectionTitle}>Historique</h2><button onClick={() => newConversation()} style={newButton}>+</button></div><div style={{ display: "grid", gap: 6 }}>{conversations.map((item) => <button key={item.id} onClick={() => openConversation(item)} style={{ ...historyButton, borderColor: conversationId === item.id ? "#d6a85f" : "#27272a" }}><strong>{item.title}</strong><span>{AI_ROLES[item.role].label}</span></button>)}{!conversations.length && <div style={muted}>Aucune conversation.</div>}</div></aside>
        <section style={{ ...cardStyle, minHeight: 650, display: "flex", flexDirection: "column" }}><div style={{ borderBottom: "1px solid #27272a", paddingBottom: 16 }}><strong>{AI_ROLES[role].label}</strong><div style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>{conversationId ? "Conversation enregistrée" : "Nouvelle conversation"}</div></div><div style={{ flex: 1, padding: "20px 0", display: "grid", gap: 14, alignContent: "start" }}>{!messages.length && <div style={{ color: "#71717a", textAlign: "center", padding: 60 }}>Ex. « Prépare mon projet pour une recherche de financement. »</div>}{messages.map((item, index) => <div key={index} style={{ justifySelf: item.role === "user" ? "end" : "start", maxWidth: "88%", padding: "13px 16px", borderRadius: 10, background: item.role === "user" ? "#1d1d24" : "#121217", border: "1px solid #27272a", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{item.content}</div>)}{loading && <div style={{ color: "#71717a", padding: 10 }}>L'orchestrateur analyse le projet…</div>}</div>{error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{error}</div>}<div style={{ display: "flex", gap: 10 }}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Demandez une analyse, un document ou un workflow…" rows={3} style={inputStyle} /><button onClick={sendMessage} disabled={loading || !input.trim()} style={sendButton}>{loading ? "…" : "Envoyer"}</button></div></section>
        <aside style={cardStyle}><h2 style={sectionTitle}>Actions proposées {pendingActions.length > 0 && <span style={pendingBadge}>{pendingActions.length}</span>}</h2><p style={{ ...muted, marginBottom: 14 }}>Les changements générés par l'IA attendent votre validation.</p><div style={{ display: "grid", gap: 10 }}>{pendingActions.map((action) => <div key={action.id} style={actionCard}><strong style={{ fontSize: 11, letterSpacing: ".06em" }}>{action.action_type}</strong><div style={{ fontSize: 13, margin: "7px 0 12px", lineHeight: 1.45 }}>{describeAction(action)}</div><div style={{ display: "flex", gap: 7 }}><button onClick={() => decideAction(action.id, "approve")} style={approveButton}>Appliquer</button><button onClick={() => decideAction(action.id, "reject")} style={rejectButton}>Refuser</button></div></div>)}{!pendingActions.length && <div style={{ color: "#52525b", fontSize: 12, padding: "25px 0" }}>Aucune modification en attente.</div>}</div></aside>
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
const workflowButton = { border: 0, borderRadius: 7, padding: "9px 13px", background: "#d6a85f", color: "#09090b", fontWeight: 700, cursor: "pointer" };
const cancelButton = { border: "1px solid #3f3f46", borderRadius: 7, padding: "9px 13px", background: "transparent", color: "#a1a1aa", cursor: "pointer" };
const workflowBanner = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, marginBottom: 12, padding: "14px 16px", border: "1px solid #5a482c", background: "#17130d", borderRadius: 10, color: "#e7c98e", flexWrap: "wrap" as const };
const runtimeBanner = { display: "grid", gap: 16, marginBottom: 14, padding: 16, border: "1px solid #3f3f46", background: "#0f0f13", borderRadius: 10 };
const progressTrack = { height: 6, borderRadius: 99, background: "#27272a", overflow: "hidden" as const };
const progressFill = { height: "100%", borderRadius: 99, background: "#d6a85f", transition: "width .3s ease" };
const stepper = { display: "grid", gap: 9 };
const stepCard = (status: string) => ({ border: `1px solid ${status === "completed" ? "#6b5a36" : status === "waiting_approval" ? "#7c5b25" : "#27272a"}`, background: status === "waiting_approval" ? "#17130d" : "#121217", borderRadius: 9, padding: 12 });
const stepNumber = (status: string) => ({ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "50%", background: status === "completed" ? "#d6a85f" : "#27272a", color: status === "completed" ? "#09090b" : "#e4e4e7", fontWeight: 700, fontSize: 12 });
const statusBadge = (status: string) => ({ fontSize: 10, padding: "4px 7px", borderRadius: 99, border: "1px solid #3f3f46", color: status === "completed" ? "#d6a85f" : status === "waiting_approval" ? "#e7c98e" : "#a1a1aa" });
const outputBox = { marginTop: 8, padding: 10, borderRadius: 7, background: "#09090b", border: "1px solid #27272a", whiteSpace: "pre-wrap" as const, lineHeight: 1.55, fontSize: 12, color: "#d4d4d8" };
const approvalHint = { marginTop: 10, padding: "8px 10px", borderRadius: 6, background: "#211a0e", color: "#e7c98e", fontSize: 11 };
const pendingBadge = { display: "inline-grid", placeItems: "center", minWidth: 18, height: 18, marginLeft: 5, borderRadius: 99, background: "#d6a85f", color: "#09090b", fontSize: 10 };
