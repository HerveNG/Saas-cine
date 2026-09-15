import { notFound } from "next/navigation";

const data: Record<string, { title: string; organization: string; type: string; region: string; deadline: string; amount: string; eligibility: string[]; documents: string[] }> = {
  "1": { title: "Documentary Development Fund", organization: "FilmFund Africa Demo", type: "Fonds", region: "International", deadline: "15 octobre 2026", amount: "Jusqu’à 20 000 €", eligibility: ["Projet documentaire", "Projet en développement", "Porteur basé en Afrique"], documents: ["Synopsis", "Note d’intention", "Note de réalisation", "Budget prévisionnel"] },
  "2": { title: "Résidence d’écriture documentaire", organization: "African Story Lab", type: "Résidence", region: "Afrique", deadline: "2 novembre 2026", amount: "Résidence + accompagnement", eligibility: ["Documentaire ou série", "Phase d’écriture / développement"], documents: ["Synopsis", "Biographie de l’auteur", "Note d’intention", "Projet détaillé"] },
  "3": { title: "Call for African Film Projects", organization: "Cinema Development Network", type: "Appel à projets", region: "International", deadline: "28 novembre 2026", amount: "Jusqu’à 50 000 €", eligibility: ["Fiction ou documentaire", "Projet africain", "Développement ou production"], documents: ["Dossier artistique", "Budget", "Plan de financement", "Calendrier"] },
  "4": { title: "Bourse première œuvre", organization: "Pan-African Cinema Initiative", type: "Bourse", region: "Afrique", deadline: "12 décembre 2026", amount: "10 000 €", eligibility: ["Première œuvre longue", "Auteur-réalisateur africain"], documents: ["Synopsis", "CV", "Note d’intention", "Budget"] },
};

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = data[id];
  if (!item) notFound();

  return <main style={{ minHeight: "100vh", padding: "40px 7vw", maxWidth: 1100 }}>
    <a href="/opportunities" style={{ color: "#a1a1aa", fontSize: 14 }}>← Toutes les opportunités</a>
    <div style={{ marginTop: 55 }}><span style={{ color: "#d6a85f", fontSize: 12, letterSpacing: "0.14em" }}>{item.type.toUpperCase()} · {item.region.toUpperCase()}</span><h1 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1, letterSpacing: "-0.05em", maxWidth: 850 }}>{item.title}</h1><p style={{ color: "#777" }}>{item.organization}</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 50, marginTop: 55 }}>
      <section><h2>Conditions d’éligibilité</h2><ul style={{ color: "#aaa", lineHeight: 2 }}>{item.eligibility.map((x) => <li key={x}>{x}</li>)}</ul><h2 style={{ marginTop: 45 }}>Documents demandés</h2><ul style={{ color: "#aaa", lineHeight: 2 }}>{item.documents.map((x) => <li key={x}>{x}</li>)}</ul></section>
      <aside style={{ border: "1px solid #292929", borderRadius: 8, padding: 25, height: "fit-content" }}><small style={{ color: "#666" }}>FINANCEMENT</small><h3>{item.amount}</h3><small style={{ color: "#666" }}>DATE LIMITE</small><p>{item.deadline}</p><button style={{ width: "100%", marginTop: 15, background: "#d6a85f", color: "#111", border: 0, padding: 14, borderRadius: 6, fontWeight: 700 }}>Ajouter à ma veille</button></aside>
    </div>
  </main>;
}
