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
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then(({ id }) => { setProjectId(id); load(id); }); }, [params]);
  async function load(id: string) {
    const response = await fetch(`/api/projects/${id}/dossier/packages`, { cache: "no-store" });
    if (response.ok) { const data = await response.json(); setProject(data.project); setPackages(data.packages); }
    setLoading(false);
  }

  return <main style={{ minHeight: "100vh", padding: "32px 5vw", color: "#eee" }}>
    <Link href={`/projects/${projectId}/documents`} style={{ color: "#999" }}>← Dossier</Link>
    <div style={{ maxWidth: 1180, margin: "45px auto" }}>
      <div style={{ color: "#d6a85f", letterSpacing: ".18em", fontSize: 11, fontWeight: 700 }}>FILMFUND AFRICA · PACKAGE ENGINE</div>
      <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)", letterSpacing: "-.05em", margin: "10px 0" }}>Un projet.<br />Plusieurs dossiers.</h1>
      <p style={{ color: "#999", maxWidth: 720, lineHeight: 1.7 }}>Adaptez automatiquement votre projet à son destinataire : financeur, producteur, diffuseur, fonds africain, institution ou investisseur.</p>
      {project && <div style={{ color: "#d6a85f", margin: "25px 0" }}>{project.title}</div>}

      {loading ? <p style={{ color: "#777" }}>Analyse des documents…</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {packages.map(item => <button key={item.id} onClick={() => setSelected(item)} style={{ textAlign: "left", color: "#eee", background: selected?.id === item.id ? "#17130d" : "#0d0d11", border: selected?.id === item.id ? "1px solid #8f6b2d" : "1px solid #292929", borderRadius: 10, padding: 20, cursor: "pointer" }}>
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
        <div style={{ marginTop: 22, padding: 16, background: "#141414", borderRadius: 8, color: "#aaa" }}>{selected.ready ? "✓ Ce package dispose de tous ses documents requis. Passez à la validation finale." : `Prochaine action : compléter ${selected.missing.map(type => labels[type] ?? type).join(", ")}.`}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}><Link href={`/projects/${projectId}/assistant`} style={button}>Ouvrir l’Assistant IA</Link><Link href={`/projects/${projectId}/documents`} style={secondary}>Gérer les documents</Link></div>
      </section>}
    </div>
  </main>;
}

const button = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#d6a85f", color: "#111", textDecoration: "none", fontWeight: 700, fontSize: 13 };
const secondary = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#171717", border: "1px solid #333", color: "#ddd", textDecoration: "none", fontSize: 13 };
