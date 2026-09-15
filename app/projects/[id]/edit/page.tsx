"use client";

import { FormEvent, useState } from "react";

export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [form, setForm] = useState({ title: "", genre: "", duration_minutes: "", country: "", language: "", theme: "", target_audience: "", logline: "", status: "draft", progress: "0" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useState(() => { params.then(({ id }) => { setId(id); fetch(`/api/projects/${id}`).then(async r => { if (r.ok) setForm(await r.json()); }); }); });

  function change(name: string, value: string) { setForm((current) => ({ ...current, [name]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null, progress: Number(form.progress) }) });
    const result = await response.json();
    setLoading(false); setMessage(response.ok ? "Projet enregistré." : result.error || "Erreur d’enregistrement.");
  }

  return <main style={{ minHeight: "100vh", padding: "40px 6vw", maxWidth: 1000 }}>
    <a href="/dashboard" style={{ color: "#a1a1aa" }}>← Dashboard</a>
    <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", letterSpacing: "-0.05em", margin: "45px 0 10px" }}>Éditer le projet</h1>
    <p style={{ color: "#a1a1aa" }}>Construisez progressivement le dossier artistique et de production.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 20, marginTop: 40 }}>
      <Field label="Titre" name="title" value={form.title} change={change} required />
      <div style={two}><Field label="Genre" name="genre" value={form.genre} change={change} /><Field label="Durée (minutes)" name="duration_minutes" type="number" value={form.duration_minutes} change={change} /></div>
      <div style={two}><Field label="Pays" name="country" value={form.country} change={change} /><Field label="Langue" name="language" value={form.language} change={change} /></div>
      <Field label="Public cible" name="target_audience" value={form.target_audience} change={change} />
      <Field label="Logline" name="logline" value={form.logline} change={change} />
      <Area label="Thème / idée" name="theme" value={form.theme} change={change} />
      <div style={two}><Field label="Statut" name="status" value={form.status} change={change} /><Field label="Progression (%)" name="progress" type="number" value={form.progress} change={change} /></div>
      {message && <p style={{ color: message === "Projet enregistré." ? "#86efac" : "#fca5a5" }}>{message}</p>}
      <button disabled={loading} style={button}>{loading ? "Enregistrement…" : "Enregistrer les modifications"}</button>
    </form>
  </main>;
}

function Field({ label, name, value, change, type = "text", required = false }: any) { return <label style={{ display: "grid", gap: 8 }}><span>{label}</span><input required={required} type={type} value={value} onChange={(e) => change(name, e.target.value)} style={input} /></label>; }
function Area({ label, name, value, change }: any) { return <label style={{ display: "grid", gap: 8 }}><span>{label}</span><textarea rows={7} value={value} onChange={(e) => change(name, e.target.value)} style={{ ...input, resize: "vertical" }} /></label>; }
const input = { width: "100%", padding: "14px 15px", borderRadius: 6, border: "1px solid #333", background: "#111116", color: "#f5f5f5", fontSize: 15 };
const two = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
const button = { background: "#d6a85f", color: "#111", border: 0, padding: "16px 22px", borderRadius: 6, fontWeight: 700, cursor: "pointer" };
