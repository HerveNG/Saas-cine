"use client";

import { useMemo, useState } from "react";

const matches = [
  { title: "Documentary Development Fund", type: "Fonds", score: 92, reason: "Documentaire · Afrique · développement", missing: "Budget détaillé" },
  { title: "Résidence d’écriture documentaire", type: "Résidence", score: 86, reason: "Documentaire · phase d’écriture", missing: "Biographie auteur" },
  { title: "Call for African Film Projects", type: "Appel à projets", score: 74, reason: "Projet africain · développement", missing: "Plan de financement" },
];

export default function ProjectOpportunities() {
  const [showOnlyStrong, setShowOnlyStrong] = useState(false);
  const visible = useMemo(() => showOnlyStrong ? matches.filter((x) => x.score >= 85) : matches, [showOnlyStrong]);

  return <main style={{ minHeight: "100vh", padding: "35px 6vw", maxWidth: 1150 }}>
    <a href="/dashboard" style={{ color: "#a1a1aa", fontSize: 14 }}>← Dashboard</a>
    <div style={{ marginTop: 50 }}><p style={{ color: "#d6a85f", letterSpacing: "0.15em", fontSize: 12 }}>MATCHING PROJET</p><h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.05em", margin: "12px 0" }}>Opportunités pour votre projet.</h1><p style={{ color: "#a1a1aa", maxWidth: 700 }}>Le moteur compare les caractéristiques du projet avec les critères connus des opportunités. Le score est un indicateur de correspondance, pas une garantie de financement.</p></div>
    <label style={{ display: "flex", gap: 10, alignItems: "center", margin: "35px 0", color: "#aaa" }}><input type="checkbox" checked={showOnlyStrong} onChange={(e) => setShowOnlyStrong(e.target.checked)} /> Afficher les correspondances ≥ 85 %</label>
    <div style={{ display: "grid", gap: 12 }}>{visible.map((item) => <article key={item.title} style={{ border: "1px solid #292929", borderRadius: 8, padding: 25, display: "grid", gridTemplateColumns: "1fr 90px", gap: 20 }}><div><span style={{ color: "#d6a85f", fontSize: 11 }}>{item.type.toUpperCase()}</span><h2 style={{ fontSize: 20, margin: "8px 0" }}>{item.title}</h2><p style={{ color: "#aaa", margin: "8px 0" }}>{item.reason}</p><p style={{ color: "#777", fontSize: 13 }}>À compléter : {item.missing}</p></div><div style={{ textAlign: "right" }}><strong style={{ fontSize: 28 }}>{item.score}%</strong><div style={{ color: "#777", fontSize: 11, marginTop: 4 }}>MATCH</div></div></article>)}</div>
  </main>;
}
