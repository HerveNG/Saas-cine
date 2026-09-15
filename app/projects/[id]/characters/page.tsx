"use client";

import { useEffect, useState } from "react";

const empty = { name: "", role: "", age: "", biography: "", personality: "", psychology: "", habits: "", relationships: "", evolution: "" };

type Character = typeof empty & { id: string };

export default function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { params.then(({ id }) => { setProjectId(id); load(id); }); }, [params]);

  async function load(id: string) { setLoading(true); const response = await fetch(`/api/projects/${id}/characters`); const data = await response.json(); setCharacters(response.ok ? data.map((x: any) => ({ ...x, age: x.age?.toString() ?? "" })) : []); setLoading(false); }
  function change(name: string, value: string) { setForm((f) => ({ ...f, [name]: value })); }
  function edit(character: Character) { setEditing(character.id); setForm({ ...empty, ...character }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function reset() { setEditing(null); setForm(empty); }

  async function save() {
    if (!form.name.trim()) return setMessage("Le nom du personnage est obligatoire.");
    setSaving(true); setMessage("");
    const response = await fetch(`/api/projects/${projectId}/characters`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...form, character_id: editing } : form) });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || "Erreur."); else { reset(); await load(projectId); setMessage(editing ? "Personnage modifié." : "Personnage créé."); }
    setSaving(false);
  }

  async function remove(id: string) { if (!confirm("Supprimer ce personnage ?")) return; const response = await fetch(`/api/projects/${projectId}/characters`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ character_id: id }) }); if (response.ok) { setCharacters((items) => items.filter((x) => x.id !== id)); if (editing === id) reset(); } }

  return <main style={{ minHeight: "100vh", padding: "32px 5vw", maxWidth: 1250, margin: "0 auto" }}>
    <nav style={{ display: "flex", justifyContent: "space-between" }}><a href={`/projects/${projectId}`} style={{ color: "#a1a1aa" }}>← Projet</a><a href="/dashboard" style={{ color: "#a1a1aa" }}>Dashboard</a></nav>
    <header style={{ marginTop: 45 }}><p style={eyebrow}>ATELIER D’ÉCRITURE</p><h1 style={hero}>Personnages</h1><p style={muted}>Construisez les personnages avec leur fonction dramatique, psychologie, relations et trajectoire.</p></header>
    <section style={layout}>
      <div style={card}><div style={head}><h2>{editing ? "Modifier le personnage" : "Nouveau personnage"}</h2>{editing && <button onClick={reset} style={linkButton}>Annuler</button>}</div>
        <div style={two}><Field label="Nom" value={form.name} onChange={(v) => change("name", v)} /><Field label="Rôle dramatique" value={form.role} onChange={(v) => change("role", v)} /></div>
        <Field label="Âge" type="number" value={form.age} onChange={(v) => change("age", v)} />
        <Area label="Biographie" value={form.biography} onChange={(v) => change("biography", v)} />
        <Area label="Personnalité" value={form.personality} onChange={(v) => change("personality", v)} />
        <Area label="Psychologie / désir / peur" value={form.psychology} onChange={(v) => change("psychology", v)} />
        <Area label="Habitudes / comportements" value={form.habits} onChange={(v) => change("habits", v)} />
        <Area label="Relations avec les autres personnages" value={form.relationships} onChange={(v) => change("relationships", v)} />
        <Area label="Évolution / arc narratif" value={form.evolution} onChange={(v) => change("evolution", v)} />
        {message && <p style={{ color: message.includes("erreur") || message.includes("obligatoire") ? "#fca5a5" : "#86efac" }}>{message}</p>}
        <button disabled={saving} onClick={save} style={primary}>{saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer le personnage"}</button>
      </div>
      <div><div style={head}><h2>Galerie des personnages</h2><span style={muted}>{characters.length} fiche(s)</span></div>{loading ? <p style={muted}>Chargement…</p> : characters.length === 0 ? <div style={emptyBox}>Aucun personnage. Commencez par créer le protagoniste.</div> : <div style={{ display: "grid", gap: 12 }}>{characters.map((c) => <article key={c.id} style={item}><div style={{ display: "flex", justifyContent: "space-between", gap: 15 }}><div><h3 style={{ margin: 0 }}>{c.name}</h3><p style={{ color: "#d6a85f", margin: "6px 0" }}>{c.role || "Rôle à définir"}{c.age ? ` · ${c.age} ans` : ""}</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => edit(c)} style={smallButton}>Modifier</button><button onClick={() => remove(c.id)} style={deleteButton}>Supprimer</button></div></div><p style={muted}>{c.biography || c.personality || "Fiche encore vide."}</p>{c.evolution && <p style={{ ...muted, borderTop: "1px solid #292929", paddingTop: 12 }}><strong style={{ color: "#d4d4d8" }}>Arc :</strong> {c.evolution}</p>}</article>)}</div>}</div>
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text" }: any) { return <label style={labelStyle}><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={input} /></label>; }
function Area({ label, value, onChange }: any) { return <label style={labelStyle}><span>{label}</span><textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, resize: "vertical" }} /></label>; }
const eyebrow = { color: "#d6a85f", letterSpacing: "0.16em", fontSize: 11 };
const hero = { fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.05em", margin: "12px 0" };
const muted = { color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 };
const layout = { display: "grid", gridTemplateColumns: "minmax(340px, 0.9fr) minmax(380px, 1.1fr)", gap: 25, marginTop: 45 };
const card = { border: "1px solid #27272a", background: "#0f0f13", borderRadius: 10, padding: 24 };
const head = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 };
const two = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const labelStyle = { display: "grid", gap: 7, marginBottom: 14, color: "#d4d4d8", fontSize: 13 };
const input = { width: "100%", padding: "12px 13px", borderRadius: 6, border: "1px solid #333", background: "#111116", color: "#f5f5f5", fontSize: 14 };
const primary = { width: "100%", background: "#d6a85f", color: "#111", border: 0, padding: "14px 18px", borderRadius: 6, fontWeight: 700, cursor: "pointer", marginTop: 5 };
const smallButton = { background: "transparent", color: "#d4d4d8", border: "1px solid #333", padding: "7px 9px", borderRadius: 5, cursor: "pointer", fontSize: 12 };
const deleteButton = { ...smallButton, color: "#fca5a5" };
const linkButton = { background: "none", border: 0, color: "#a1a1aa", cursor: "pointer" };
const emptyBox = { border: "1px dashed #333", padding: 25, borderRadius: 8, color: "#777" };
const item = { border: "1px solid #27272a", borderRadius: 8, padding: 18, background: "#121217" };
