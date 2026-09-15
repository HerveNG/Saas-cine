"use client";

import { useMemo, useState } from "react";

const opportunities = [
  { id: "1", title: "Documentary Development Fund", organization: "FilmFund Africa Demo", type: "Fonds", region: "International", genres: ["Documentaire"], deadline: "15 octobre 2026", amount: "Jusqu’à 20 000 €", description: "Soutien au développement de projets documentaires portés par des auteurs africains." },
  { id: "2", title: "Résidence d’écriture documentaire", organization: "African Story Lab", type: "Résidence", region: "Afrique", genres: ["Documentaire", "Série"], deadline: "2 novembre 2026", amount: "Résidence + accompagnement", description: "Programme d’accompagnement destiné aux auteurs en phase d’écriture et de développement." },
  { id: "3", title: "Call for African Film Projects", organization: "Cinema Development Network", type: "Appel à projets", region: "International", genres: ["Fiction", "Documentaire"], deadline: "28 novembre 2026", amount: "Jusqu’à 50 000 €", description: "Appel international pour des projets audiovisuels en développement ou production." },
  { id: "4", title: "Bourse première œuvre", organization: "Pan-African Cinema Initiative", type: "Bourse", region: "Afrique", genres: ["Fiction", "Documentaire"], deadline: "12 décembre 2026", amount: "10 000 €", description: "Bourse destinée aux cinéastes développant leur première œuvre longue." },
];

export default function OpportunitiesPage() {
  const [filter, setFilter] = useState("Tous");
  const [selected, setSelected] = useState(opportunities[0]);
  const filters = ["Tous", "Fonds", "Résidence", "Appel à projets", "Bourse"];
  const filtered = useMemo(() => filter === "Tous" ? opportunities : opportunities.filter((o) => o.type === filter), [filter]);

  return (
    <main style={{ minHeight: "100vh", padding: "32px 5vw" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", paddingBottom: 22, gap: 20 }}>
        <a href="/" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>FILMFUND AFRICA</a>
        <nav style={{ display: "flex", gap: 22, color: "#a1a1aa", fontSize: 14 }}><a href="/dashboard">Dashboard</a><a href="/opportunities" style={{ color: "#f5f5f5" }}>Opportunités</a></nav>
      </header>

      <section style={{ padding: "55px 0 35px" }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>VEILLE FINANCEMENT</p>
        <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.05em", margin: "12px 0" }}>Les opportunités qui comptent.</h1>
        <p style={{ color: "#a1a1aa", maxWidth: 700, lineHeight: 1.6 }}>Retrouvez fonds, bourses, résidences et appels à projets. Le moteur de matching pourra ensuite filtrer automatiquement les opportunités selon votre projet.</p>
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 30 }}>{filters.map((item) => <button key={item} onClick={() => setFilter(item)} style={{ padding: "9px 14px", borderRadius: 20, border: `1px solid ${filter === item ? "#d6a85f" : "#333"}`, background: filter === item ? "#1d1810" : "transparent", color: filter === item ? "#d6a85f" : "#999", cursor: "pointer" }}>{item}</button>)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, .8fr)", gap: 20 }}>
        <section style={{ borderTop: "1px solid #292929" }}>
          {filtered.map((item) => <button key={item.id} onClick={() => setSelected(item)} style={{ display: "block", width: "100%", textAlign: "left", padding: "22px 5px", border: 0, borderBottom: "1px solid #292929", background: selected.id === item.id ? "#111116" : "transparent", color: "#f5f5f5", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}><div><span style={{ color: "#d6a85f", fontSize: 11, letterSpacing: "0.08em" }}>{item.type.toUpperCase()}</span><h3 style={{ margin: "8px 0" }}>{item.title}</h3><span style={{ color: "#777", fontSize: 13 }}>{item.organization} · {item.region}</span></div><span style={{ color: "#999", fontSize: 12, whiteSpace: "nowrap" }}>{item.deadline}</span></div></button>)}
        </section>

        <aside style={{ border: "1px solid #292929", borderRadius: 8, padding: 25, alignSelf: "start", position: "sticky", top: 20 }}>
          <span style={{ color: "#d6a85f", fontSize: 11, letterSpacing: "0.1em" }}>{selected.type.toUpperCase()}</span>
          <h2 style={{ fontSize: 25, margin: "10px 0" }}>{selected.title}</h2>
          <p style={{ color: "#777", fontSize: 13 }}>{selected.organization}</p>
          <p style={{ color: "#aaa", lineHeight: 1.7 }}>{selected.description}</p>
          <div style={{ borderTop: "1px solid #292929", paddingTop: 18, marginTop: 18 }}><small style={{ color: "#666" }}>FINANCEMENT / AVANTAGE</small><p style={{ marginTop: 7 }}>{selected.amount}</p></div>
          <div><small style={{ color: "#666" }}>DATE LIMITE</small><p style={{ marginTop: 7 }}>{selected.deadline}</p></div>
          <button style={{ width: "100%", background: "#d6a85f", color: "#111", border: 0, padding: "13px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>Ajouter à ma veille</button>
        </aside>
      </div>
    </main>
  );
}
