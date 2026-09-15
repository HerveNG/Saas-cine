"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const TYPES = [
  ["synopsis", "Synopsis"], ["intent_note", "Note d’intention"], ["director_note", "Note de réalisation"],
  ["bible", "Bible"], ["pitch_deck", "Pitch deck"], ["scenario", "Scénario"],
  ["technical_breakdown", "Dépouillement technique"], ["budget", "Budget"],
  ["financing_plan", "Plan de financement"], ["production_schedule", "Planning de production"],
] as const;

const DOSSIER_ORDER = ["synopsis", "intent_note", "director_note", "production_schedule", "budget", "financing_plan", "pitch_deck"];
const DOSSIER_LABELS: Record<string, string> = Object.fromEntries(TYPES);

type Document = { id: string; type: string; title: string; content: string; status: string; current_version: number; updated_at: string };
type Workflow = { id: string; title: string; goal: string; status: string; current_task_index: number; created_at?: string; tasks: { id: string; task_index: number; role: string; output_label: string; status: string; output?: string | null; action_ids?: string[] }[] } | null;
type Validation = { ready: boolean; summary: string; checkedAt: string; checks: { code: string; label: string; status: "ok" | "warning" | "missing"; detail: string }[] } | null;

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [type, setType] = useState("synopsis");
  const [title, setTitle] = useState("Synopsis");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [validation, setValidation] = useState<Validation>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => { params.then(({ id }) => { setProjectId(id); load(id); loadWorkflow(id); validateDossier(id); }); }, [params]);

  async function load(id: string) {
    const response = await fetch(`/api/projects/${id}/documents`);
    if (response.ok) setDocuments(await response.json());
  }

  async function loadWorkflow(id: string) {
    const response = await fetch(`/api/projects/${id}/assistant/workflows`);
    if (!response.ok) return;
    const data = await response.json();
    const candidates = data.filter((item: Workflow) => item && ["running", "waiting_approval", "completed", "failed"].includes(item.status));
    const current = candidates.sort((a: Workflow, b: Workflow) => String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? "")))[0];
    if (!current) return;
    const detail = await fetch(`/api/projects/${id}/assistant/workflows/${current.id}`);
    if (detail.ok) setWorkflow(await detail.json());
  }

  async function validateDossier(id = projectId) {
    if (!id || validationLoading) return;
    setValidationLoading(true);
    try {
      const response = await fetch(`/api/projects/${id}/dossier/validate`, { cache: "no-store" });
      if (response.ok) setValidation(await response.json());
    } finally { setValidationLoading(false); }
  }

  async function runWorkflow() {
    if (!workflow || workflowLoading || ["completed", "cancelled", "waiting_approval"].includes(workflow.status)) return;
    setWorkflowLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant/workflows/${workflow.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "run" }) });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error || "Impossible d’exécuter l’étape.");
      setWorkflow(data.workflow ? { ...data.workflow, tasks: data.tasks ?? workflow.tasks } : workflow);
      await load(projectId); await loadWorkflow(projectId); await validateDossier(projectId);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur du workflow."); }
    finally { setWorkflowLoading(false); }
  }

  function newDocument() { setSelected(null); setType("synopsis"); setTitle("Synopsis"); setContent(""); setMessage(""); }
  function editDocument(doc: Document) { setSelected(doc); setType(doc.type); setTitle(doc.title); setContent(doc.content); setMessage(`Version ${doc.current_version}`); }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const url = selected ? `/api/projects/${projectId}/documents/${selected.id}` : `/api/projects/${projectId}/documents`;
    const response = await fetch(url, { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected ? { title, content, status: "draft" } : { type, title, content }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) { setMessage(result.error || "Erreur d’enregistrement."); return; }
    await load(projectId); await validateDossier(projectId); setMessage(selected ? `Document enregistré — version ${result.version}.` : "Document créé.");
  }

  async function remove() {
    if (!selected || !confirm("Supprimer définitivement ce document ?")) return;
    const response = await fetch(`/api/projects/${projectId}/documents/${selected.id}`, { method: "DELETE" });
    if (response.ok) { newDocument(); await load(projectId); await validateDossier(projectId); setMessage("Document supprimé."); }
  }

  const label = (value: string) => DOSSIER_LABELS[value] ?? value;
  const dossier = useMemo(() => DOSSIER_ORDER.map((kind) => ({ kind, doc: documents.find((item) => item.type === kind) })), [documents]);
  const dossierCount = dossier.filter((item) => item.doc).length;
  const pendingApproval = workflow?.tasks.filter((task) => task.status === "waiting_approval").length ?? 0;
  const workflowDone = workflow?.tasks.filter((task) => task.status === "completed").length ?? 0;
  const workflowTotal = workflow?.tasks.length ?? 0;
  const blockingIssues = validation?.checks.filter((check) => check.status === "missing") ?? [];
  const warnings = validation?.checks.filter((check) => check.status === "warning") ?? [];

  return <main style={{ minHeight: "100vh", padding: "32px 5vw" }}>
    <Link href={`/projects/${projectId}`} style={{ color: "#aaa", fontSize: 14 }}>← Projet</Link>
    <div style={{ maxWidth: 1250, margin: "45px auto" }}>
      <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>FILMFUND AFRICA · DOSSIER</p>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.05em", margin: "10px 0" }}>Construire le dossier.</h1>
      <p style={{ color: "#aaa", maxWidth: 720, lineHeight: 1.6 }}>Les livrables produits par les agents deviennent de vrais documents versionnés. Vous gardez la validation finale de chaque modification.</p>

      {workflow && <section style={workflowCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={eyebrow}>WORKFLOW DE PRODUCTION</div><h2 style={{ margin: "6px 0", fontSize: 22 }}>{workflow.title}</h2><div style={muted}>{workflowDone}/{workflowTotal} étapes terminées · {dossierCount}/7 documents principaux</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{pendingApproval > 0 && <span style={approvalBadge}>{pendingApproval} validation{pendingApproval > 1 ? "s" : ""} requise{pendingApproval > 1 ? "s" : ""}</span>}<Link href={`/projects/${projectId}/assistant`} style={secondary}>Assistant IA</Link>{! ["completed", "cancelled", "waiting_approval"].includes(workflow.status) && <button onClick={runWorkflow} disabled={workflowLoading} style={primary}>{workflowLoading ? "Génération…" : "Générer la prochaine étape"}</button>}</div>
        </div>
        <div style={track}><div style={{ ...fill, width: `${workflowTotal ? Math.round((workflowDone / workflowTotal) * 100) : 0}%` }} /></div>
        <div style={miniSteps}>{workflow.tasks.map(task => <div key={task.id} style={miniStep(task.status)}><span>{task.task_index + 1}</span><div><strong>{task.output_label}</strong><small>{task.status === "waiting_approval" ? "Validation requise" : task.status === "completed" ? "Terminé" : task.status === "failed" ? "À relancer" : task.status === "pending" ? "En attente" : "En cours"}</small></div></div>)}</div>
      </section>}

      <section style={validationCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div><div style={eyebrow}>CONTRÔLE DE COHÉRENCE</div><h2 style={{ margin: "6px 0" }}>Validation du dossier</h2><p style={{ ...muted, maxWidth: 680, margin: 0 }}>{validation?.summary ?? "Lancez le contrôle automatique de complétude et de cohérence."}</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={validation?.ready ? readyBadge : warningBadge}>{validation ? (validation.ready ? "DOSSIER PRÊT" : "À CORRIGER") : "NON CONTRÔLÉ"}</span><button onClick={() => validateDossier()} disabled={validationLoading} style={secondary}>{validationLoading ? "Contrôle…" : "Valider le dossier"}</button></div>
        </div>
        {validation && <>
          <div style={validationStats}><div><strong>{validation.checks.filter(c => c.status === "ok").length}</strong><small>Contrôles OK</small></div><div><strong>{warnings.length}</strong><small>Points à vérifier</small></div><div><strong>{blockingIssues.length}</strong><small>Éléments manquants</small></div></div>
          <div style={checksGrid}>{validation.checks.map(check => <div key={check.code} style={checkCard(check.status)}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{check.label}</strong><span style={statusPill(check.status)}>{check.status === "ok" ? "OK" : check.status === "warning" ? "À vérifier" : "Manquant"}</span></div><p>{check.detail}</p></div>)}</div>
          <small style={{ color: "#666", display: "block", marginTop: 14 }}>Dernier contrôle : {new Date(validation.checkedAt).toLocaleString("fr-FR")}</small>
        </>}
      </section>

      <section style={dossierCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 15, marginBottom: 20 }}><div><div style={eyebrow}>STRUCTURE DU DOSSIER</div><h2 style={{ margin: "5px 0 0" }}>Dossier de financement</h2></div><span style={muted}>{dossierCount}/7 sections</span></div>
        <div style={dossierGrid}>{dossier.map(({ kind, doc }, index) => <button key={kind} onClick={() => doc && editDocument(doc)} disabled={!doc} style={sectionCard(Boolean(doc))}><span style={sectionNumber(Boolean(doc))}>{index + 1}</span><div style={{ flex: 1, textAlign: "left" }}><strong>{label(kind)}</strong><small>{doc ? `Version ${doc.current_version} · ${doc.status}` : "Pas encore généré"}</small></div><span style={{ color: doc ? "#d6a85f" : "#555" }}>{doc ? "→" : "○"}</span></button>)}</div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 25, marginTop: 25 }}>
        <aside style={cardStyle}>
          <button onClick={newDocument} style={primary}>+ Nouveau document</button>
          <div style={{ marginTop: 20 }}>{documents.map(doc => <button key={doc.id} onClick={() => editDocument(doc)} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 10px", marginBottom: 5, border: 0, borderLeft: selected?.id === doc.id ? "2px solid #d6a85f" : "2px solid transparent", background: selected?.id === doc.id ? "#17130d" : "transparent", color: "#ddd", cursor: "pointer" }}><strong style={{ display: "block" }}>{doc.title}</strong><small style={{ color: "#777" }}>{label(doc.type)} · v{doc.current_version}</small></button>)}</div>
        </aside>

        <section style={cardStyle}>
          <form onSubmit={save}>
            {!selected && <label style={field}><span>Type de document</span><select value={type} onChange={e => { setType(e.target.value); setTitle(label(e.target.value)); }} style={input}>{TYPES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}
            <label style={field}><span>Titre</span><input value={title} onChange={e => setTitle(e.target.value)} style={input} /></label>
            <label style={field}><span>Contenu</span><textarea value={content} onChange={e => setContent(e.target.value)} rows={22} placeholder="Commencez à rédiger votre document…" style={{ ...input, resize: "vertical", lineHeight: 1.7 }} /></label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div>{selected && <button type="button" onClick={remove} style={danger}>Supprimer</button>}</div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ color: "#888", fontSize: 13 }}>{message}</span><button disabled={saving} style={primary}>{saving ? "Enregistrement…" : selected ? "Enregistrer une nouvelle version" : "Créer le document"}</button></div></div>
          </form>
        </section>
      </div>
    </div>
  </main>;
}

const muted = { color: "#888", fontSize: 13, lineHeight: 1.5 };
const eyebrow = { color: "#d6a85f", letterSpacing: ".14em", fontSize: 10, fontWeight: 700 };
const workflowCard = { border: "1px solid #3a3020", background: "linear-gradient(135deg,#15120d,#101012)", borderRadius: 10, padding: 22, marginBottom: 20 };
const validationCard = { border: "1px solid #3a3020", background: "#0d0d11", borderRadius: 10, padding: 22, marginBottom: 20 };
const dossierCard = { border: "1px solid #292929", borderRadius: 10, padding: 22, background: "#0d0d11" };
const cardStyle = { border: "1px solid #292929", borderRadius: 8, padding: 20, background: "#0d0d11" };
const track = { height: 5, background: "#242424", borderRadius: 99, overflow: "hidden" as const, margin: "20px 0" };
const fill = { height: "100%", background: "#d6a85f", borderRadius: 99, transition: "width .3s" };
const primary = { background: "#d6a85f", color: "#111", border: 0, padding: "11px 15px", borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const secondary = { background: "transparent", color: "#ddd", border: "1px solid #444", padding: "10px 14px", borderRadius: 6, fontWeight: 600, cursor: "pointer", textDecoration: "none" };
const approvalBadge = { color: "#f2d18c", border: "1px solid #604b27", background: "#201a10", padding: "8px 10px", borderRadius: 6, fontSize: 12 };
const readyBadge = { color: "#b8e0b8", border: "1px solid #416341", background: "#101810", padding: "8px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".08em" };
const warningBadge = { color: "#f2d18c", border: "1px solid #604b27", background: "#201a10", padding: "8px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: ".08em" };
const miniSteps = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 };
const miniStep = (status: string) => ({ display: "flex", gap: 8, alignItems: "center", padding: 9, border: `1px solid ${status === "completed" ? "#51401f" : status === "waiting_approval" ? "#765b2d" : "#252525"}`, borderRadius: 6, background: status === "waiting_approval" ? "#18140d" : "#111114" });
const validationStats = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "20px 0" };
const checksGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
const checkCard = (status: string) => ({ padding: 13, border: `1px solid ${status === "ok" ? "#303d30" : status === "warning" ? "#4a3c24" : "#4a2828"}`, borderRadius: 7, background: status === "ok" ? "#101510" : status === "warning" ? "#15120d" : "#160f0f" });
const statusPill = (status: string) => ({ color: status === "ok" ? "#a9d6a9" : status === "warning" ? "#e5c37a" : "#d99b9b", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const });
const dossierGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
const sectionCard = (ready: boolean) => ({ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 13, border: `1px solid ${ready ? "#393124" : "#242424"}`, borderRadius: 7, background: ready ? "#13120f" : "#101013", color: ready ? "#eee" : "#666", cursor: ready ? "pointer" : "default" });
const sectionNumber = (ready: boolean) => ({ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: ready ? "#d6a85f" : "#222", color: ready ? "#111" : "#666", fontSize: 12, fontWeight: 700, flexShrink: 0 });
const input = { width: "100%", marginTop: 8, padding: 13, background: "#111116", color: "#f5f5f5", border: "1px solid #333", borderRadius: 6, boxSizing: "border-box" as const };
const field = { display: "block", marginBottom: 20, color: "#aaa", fontSize: 13 };
const danger = { background: "transparent", color: "#c77", border: "1px solid #533", padding: "10px 14px", borderRadius: 6, cursor: "pointer" };
