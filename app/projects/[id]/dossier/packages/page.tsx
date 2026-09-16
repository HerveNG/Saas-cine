"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PackageView = {
  id: string;
  label: string;
  description: string;
  audience: string;
  requiredDocuments: string[];
  optionalDocuments: string[];
  workflowGoal: string;
  ready: boolean;
  completion: number;
  missing: string[];
};

type Validation = {
  ready: boolean;
  completion: number;
  missing: string[];
  summary: string;
  checks: Array<{ code: string; label: string; status: "ok" | "warning" | "missing"; detail: string }>;
};

const labels: Record<string, string> = {
  synopsis: "Synopsis", intent_note: "Note d’intention", director_note: "Note de réalisation",
  production_schedule: "Planning de production", budget: "Budget", financing_plan: "Plan de financement",
  pitch_deck: "Pitch deck", bible: "Bible", scenario: "Scénario", technical_breakdown: "Dépouillement technique",
};

export default function PackagesPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<{ title: string } | null>(null);
  const [packages, setPackages] = useState<PackageView[]>([]);
  const [selected, setSelected] = useState<PackageView | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { params.then(({ id }) => { setProjectId(id); load(id); }); }, [params]);

  async function load(id: string) {
    const response = await fetch(`/api/projects/${id}/dossier/packages`, { cache: "no-store" });
    if (response.ok) { const data = await response.json(); setProject(data.project); setPackages(data.packages); }
    setLoading(false);
  }

  async function selectPackage(item: PackageView) {
    setSelected(item); setMessage(""); setValidation(null); setValidating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/dossier/packages/${item.id}/validate`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Validation impossible.");
      setValidation(data.validation);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de validation.");
    } finally { setValidating(false); }
  }

  async function launchPackage() {
    if (!selected || launching) return;
    setLaunching(true); setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/assistant/workflows`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id, goal: selected.workflowGoal }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de lancer le workflow.");
      window.location.href = `/projects/${projectId}/assistant?workflow=${data.workflow.id}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de lancement.");
    } finally { setLaunching(false); }
  }

  const currentValidation = validation;
  const canExport = Boolean(currentValidation?.ready);
  const docxUrl = selected ? `/api/projects/${projectId}/dossier/packages/${selected.id}/export/docx` : "";

  return <main style={{ minHeight: "100vh", padding: "32px 5vw", color: "#eee" }}>
    <Link href={`/projects/${projectId}/documents`} style={{ color: "#999" }}>← Dossier</Link>
    <div style={{ maxWidth: 1180, margin: "45px auto" }}>
      <div style={{ color: "#d6a85f", letterSpacing: ".18em", fontSize: 11, fontWeight: 700 }}>FILMFUND AFRICA · PACKAGE ENGINE</div>
      <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)", letterSpacing: "-.05em", margin: "10px 0" }}>Un projet.<br />Plusieurs dossiers.</h1>
      <p style={{ color: "#999", maxWidth: 720, lineHeight: 1.7 }}>Adaptez automatiquement votre projet à son destinataire : financeur, producteur, diffuseur, fonds africain, institution ou investisseur.</p>
      {project && <div style={{ color: "#d6a85f", margin: "25px 0" }}>{project.title}</div>}

      {loading ? <p style={{ color: "#777" }}>Analyse des documents…</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {packages.map(item => <button key={item.id} onClick={() => selectPackage(item)} style={{ textAlign: "left", color: "#eee", background: selected?.id === item.id ? "#17130d" : "#0d0d11", border: selected?.id === item.id ? "1px solid #8f6b2d" : "1px solid #292929", borderRadius: 10, padding: 20, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong style={{ fontSize: 17 }}>{item.label}</strong><span style={{ color: item.ready ? "#9ac7a0" : "#d6a85f", fontSize: 12 }}>{item.completion}%</span></div>
          <p style={{ color: "#999", lineHeight: 1.5, minHeight: 48 }}>{item.description}</p>
          <small style={{ color: "#666" }}>{item.audience}</small>
          <div style={{ height: 4, background: "#242424", borderRadius: 99, marginTop: 15 }}><div style={{ height: 4, width: `${item.completion}%`, background: "#d6a85f", borderRadius: 99 }} /></div>
        </button>)}
      </div>}

      {selected && <section style={{ marginTop: 22, padding: 24, border: "1px solid #3a3020", borderRadius: 10, background: "#0d0d11" }}>
        <div style={{ color: "#d6a85f", fontSize: 10, letterSpacing: ".15em", fontWeight: 700 }}>PACKAGE SÉLECTIONNÉ</div>
        <h2 style={{ margin: "7px 0" }}>{selected.label}</h2><p style={{ color: "#aaa", lineHeight: 1.6 }}>{selected.workflowGoal}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginTop: 20 }}>
          <div><strong>Documents requis</strong>{selected.requiredDocuments.map(type => <div key={type} style={{ padding: "8px 0", color: selected.missing.includes(type) ? "#d48b75" : "#aaa" }}>{selected.missing.includes(type) ? "○" : "✓"} {labels[type] ?? type}</div>)}</div>
          <div><strong>Documents optionnels</strong>{selected.optionalDocuments.map(type => <div key={type} style={{ padding: "8px 0", color: "#777" }}>+ {labels[type] ?? type}</div>)}</div>
        </div>

        <div style={{ marginTop: 22, padding: 16, background: "#141414", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>Contrôle du package</strong>
            <span style={{ color: validating ? "#d6a85f" : currentValidation?.ready ? "#9ac7a0" : "#d48b75" }}>{validating ? "Contrôle…" : currentValidation ? (currentValidation.ready ? "✓ PRÊT" : "À CORRIGER") : "NON CONTRÔLÉ"}</span>
          </div>
          {currentValidation && <><p style={{ color: "#aaa", lineHeight: 1.6, marginBottom: 12 }}>{currentValidation.summary}</p>{currentValidation.checks.map(check => <div key={check.code} style={{ padding: "8px 0", borderTop: "1px solid #242424", color: check.status === "ok" ? "#9ac7a0" : check.status === "missing" ? "#d48b75" : "#d6a85f" }}>{check.status === "ok" ? "✓" : check.status === "missing" ? "○" : "!"} <strong>{check.label}</strong><div style={{ color: "#777", marginTop: 3, marginLeft: 18 }}>{check.detail}</div></div>)}</>}
        </div>

        {message && <div style={{ marginTop: 14, padding: 13, borderRadius: 7, border: "1px solid #633b32", color: "#e0a08c", background: "#1a100e" }}>{message}</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button onClick={launchPackage} disabled={launching} style={button}>{launching ? "Lancement…" : "Lancer la production IA"}</button>
          {canExport && <><a href={`/api/projects/${projectId}/dossier/packages/${selected.id}/export`} style={exportButton}>Exporter PDF</a><a href={docxUrl} style={exportButton}>Exporter DOCX</a></>}
          <Link href={`/projects/${projectId}/assistant`} style={secondary}>Ouvrir l’Assistant IA</Link>
          <Link href={`/projects/${projectId}/documents`} style={secondary}>Gérer les documents</Link>
        </div>
      </section>}
    </div>
  </main>;
}

const button = { display: "inline-block", padding: "11px 16px", borderRadius: 6, border: "none", background: "#d6a85f", color: "#111", cursor: "pointer", fontWeight: 700, fontSize: 13 };
const exportButton = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#202018", border: "1px solid #6b5a36", color: "#e7c98e", textDecoration: "none", fontWeight: 700, fontSize: 13 };
const secondary = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#171717", border: "1px solid #333", color: "#ddd", textDecoration: "none", fontSize: 13 };
