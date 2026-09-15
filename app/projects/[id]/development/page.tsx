"use client";

import { useState } from "react";

const steps = ["Concept", "Sujet", "Personnages", "Enjeu", "Vision"];

export default function DevelopmentPage() {
  const [active, setActive] = useState(0);
  const [generated, setGenerated] = useState(false);

  return (
    <main style={{ minHeight: "100vh", padding: "32px 5vw" }}>
      <a href="/dashboard" style={{ color: "#a1a1aa", fontSize: 14 }}>← Dashboard</a>
      <div style={{ maxWidth: 1100, margin: "50px auto" }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>ASSISTANT DE DÉVELOPPEMENT</p>
        <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.05em", margin: "12px 0" }}>Développer mon projet</h1>
        <p style={{ color: "#a1a1aa", maxWidth: 700, lineHeight: 1.6 }}>L’assistant structure progressivement votre idée pour préparer un dossier audiovisuel professionnel.</p>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 45, marginTop: 55 }}>
          <aside>{steps.map((step, index) => <button key={step} onClick={() => setActive(index)} style={{ display: "block", width: "100%", textAlign: "left", padding: "16px 14px", border: 0, borderLeft: `2px solid ${active === index ? "#d6a85f" : "#292929"}`, background: "transparent", color: active === index ? "#f5f5f5" : "#777", cursor: "pointer" }}>{index + 1}. {step}</button>)}</aside>
          <section style={{ border: "1px solid #292929", borderRadius: 8, padding: 30, minHeight: 430 }}>
            <span style={{ color: "#666", fontSize: 12 }}>ÉTAPE {active + 1} / {steps.length}</span>
            <h2 style={{ marginTop: 15 }}>{steps[active]}</h2>
            <p style={{ color: "#a1a1aa", lineHeight: 1.7 }}>Décrivez cette partie de votre projet avec vos propres mots. L’assistant pourra ensuite la reformuler et l’enrichir sans perdre votre intention d’auteur.</p>
            <textarea rows={9} placeholder={active === 0 ? "Quelle est l’idée centrale de votre projet ?" : "Écrivez librement..."} style={{ width: "100%", marginTop: 15, padding: 15, background: "#111116", color: "#f5f5f5", border: "1px solid #333", borderRadius: 6, resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              <button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0} style={secondary}>Précédent</button>
              {active < steps.length - 1 ? <button onClick={() => setActive(active + 1)} style={primary}>Continuer →</button> : <button onClick={() => setGenerated(true)} style={primary}>Générer le dossier →</button>}
            </div>
            {generated && <div style={{ marginTop: 22, padding: 16, background: "#17130d", border: "1px solid #3c3324", color: "#d6a85f" }}>Génération prête : synopsis, note d’intention et note de réalisation seront produits à partir de votre brief.</div>}
          </section>
        </div>
      </div>
    </main>
  );
}

const primary = { background: "#d6a85f", color: "#111", border: 0, padding: "13px 18px", borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const secondary = { background: "transparent", color: "#aaa", border: "1px solid #333", padding: "13px 18px", borderRadius: 6, cursor: "pointer" };
