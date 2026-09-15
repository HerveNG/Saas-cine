"use client";

import { FormEvent, useEffect, useState } from "react";

const TYPES = [
  ["synopsis", "Synopsis"], ["intent_note", "Note d’intention"], ["director_note", "Note de réalisation"],
  ["bible", "Bible"], ["pitch_deck", "Pitch deck"], ["scenario", "Scénario"],
  ["technical_breakdown", "Dépouillement technique"], ["budget", "Budget"],
  ["financing_plan", "Plan de financement"], ["production_schedule", "Planning de production"],
] as const;

type Document = { id: string; type: string; title: string; content: string; status: string; current_version: number; updated_at: string };

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState<Document | null>(null);
  const [type, setType] = useState("synopsis");
  const [title, setTitle] = useState("Synopsis");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { params.then(({ id }) => { setProjectId(id); load(id); }); }, [params]);

  async function load(id: string) {
    const response = await fetch(`/api/projects/${id}/documents`);
    if (response.ok) setDocuments(await response.json());
  }

  function newDocument() { setSelected(null); setType("synopsis"); setTitle("Synopsis"); setContent(""); setMessage(""); }
  function editDocument(doc: Document) { setSelected(doc); setType(doc.type); setTitle(doc.title); setContent(doc.content); setMessage(`Version ${doc.current_version}`); }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const url = selected ? `/api/projects/${projectId}/documents/${selected.id}` : `/api/projects/${projectId}/documents`;
    const response = await fetch(url, { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected ? { title, content, status: "draft" } : { type, title, content }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) { setMessage(result.error || "Erreur d’enregistrement."); return; }
    await load(projectId); setMessage(selected ? `Document enregistré — version ${result.version}.` : "Document créé.");
  }

  async function remove() {
    if (!selected || !confirm("Supprimer définitivement ce document ?")) return;
    const response = await fetch(`/api/projects/${projectId}/documents/${selected.id}`, { method: "DELETE" });
    if (response.ok) { newDocument(); await load(projectId); setMessage("Document supprimé."); }
  }

  const label = (value: string) => TYPES.find(([key]) => key === value)?.[1] ?? value;

  return <main style={{ minHeight: "100vh", padding: "32px 5vw" }}>
    <a href={`/projects/${projectId}`} style={{ color: "#aaa", fontSize: 14 }}>← Projet</a>
    <div style={{ maxWidth: 1250, margin: "45px auto" }}>
      <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>ATELIER DOCUMENTS</p>
      <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.05em", margin: "10px 0" }}>Construire le dossier.</h1>
      <p style={{ color: "#aaa", maxWidth: 720, lineHeight: 1.6 }}>Chaque modification du contenu crée automatiquement une nouvelle version afin de préserver l’historique rédactionnel du projet.</p>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 25, marginTop: 40 }}>
        <aside style={{ border: "1px solid #292929", borderRadius: 8, padding: 18, height: "fit-content" }}>
          <button onClick={newDocument} style={primary}>+ Nouveau document</button>
          <div style={{ marginTop: 20 }}>{documents.map(doc => <button key={doc.id} onClick={() => editDocument(doc)} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 10px", marginBottom: 5, border: 0, borderLeft: selected?.id === doc.id ? "2px solid #d6a85f" : "2px solid transparent", background: selected?.id === doc.id ? "#17130d" : "transparent", color: "#ddd", cursor: "pointer" }}><strong style={{ display: "block" }}>{doc.title}</strong><small style={{ color: "#777" }}>{label(doc.type)} · v{doc.current_version}</small></button>)}</div>
        </aside>

        <section style={{ border: "1px solid #292929", borderRadius: 8, padding: 28 }}>
          <form onSubmit={save}>
            {!selected && <label style={field}><span>Type de document</span><select value={type} onChange={e => { setType(e.target.value); setTitle(label(e.target.value)); }} style={input}>{TYPES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>}
            <label style={field}><span>Titre</span><input value={title} onChange={e => setTitle(e.target.value)} style={input} /></label>
            <label style={field}><span>Contenu</span><textarea value={content} onChange={e => setContent(e.target.value)} rows={22} placeholder="Commencez à rédiger votre document…" style={{ ...input, resize: "vertical", lineHeight: 1.7 }} /></label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>{selected && <button type="button" onClick={remove} style={danger}>Supprimer</button>}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ color: "#888", fontSize: 13 }}>{message}</span><button disabled={saving} style={primary}>{saving ? "Enregistrement…" : selected ? "Enregistrer une nouvelle version" : "Créer le document"}</button></div>
            </div>
          </form>
        </section>
      </div>
    </div>
  </main>;
}

const input = { width: "100%", marginTop: 8, padding: 13, background: "#111116", color: "#f5f5f5", border: "1px solid #333", borderRadius: 6, boxSizing: "border-box" as const };
const field = { display: "block", marginBottom: 20, color: "#aaa", fontSize: 13 };
const primary = { background: "#d6a85f", color: "#111", border: 0, padding: "12px 16px", borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const danger = { background: "transparent", color: "#c77", border: "1px solid #533", padding: "10px 14px", borderRadius: 6, cursor: "pointer" };
