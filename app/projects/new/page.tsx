"use client";

import { FormEvent, useState } from "react";

const types = ["Documentaire", "Fiction", "Série"];

export default function NewProjectPage() {
  const [type, setType] = useState("Documentaire");
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px 6vw", maxWidth: 1000 }}>
      <a href="/dashboard" style={{ color: "#a1a1aa", fontSize: 14 }}>← Retour au dashboard</a>
      <div style={{ marginTop: 55 }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>NOUVEAU PROJET</p>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.05em", margin: "12px 0" }}>Développons votre histoire.</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, maxWidth: 650 }}>Quelques informations suffisent pour lancer l’assistant de développement. Vous pourrez enrichir le projet ensuite.</p>
      </div>

      <form onSubmit={submit} style={{ marginTop: 50, display: "grid", gap: 26 }}>
        <label style={{ display: "grid", gap: 10 }}>
          <span>Titre du projet</span>
          <input name="title" required placeholder="Ex. Les voix du fleuve" style={inputStyle} />
        </label>

        <div>
          <span style={{ display: "block", marginBottom: 12 }}>Type de projet</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {types.map((item) => (
              <button type="button" key={item} onClick={() => setType(item)} style={{ ...choiceStyle, borderColor: type === item ? "#d6a85f" : "#333", background: type === item ? "#1d1810" : "#111116" }}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "grid", gap: 10 }}>
            <span>Genre</span>
            <input name="genre" required placeholder="Ex. Société / Culture" style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 10 }}>
            <span>Durée cible (minutes)</span>
            <input name="duration" type="number" min={1} placeholder="90" style={inputStyle} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "grid", gap: 10 }}>
            <span>Pays</span>
            <input name="country" required placeholder="Cameroun" style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 10 }}>
            <span>Langue principale</span>
            <input name="language" placeholder="Français" style={inputStyle} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 10 }}>
          <span>Thème / idée de départ</span>
          <textarea name="theme" rows={6} placeholder="Décrivez en quelques lignes ce que vous voulez raconter..." style={{ ...inputStyle, resize: "vertical" }} />
        </label>

        {submitted ? (
          <div style={{ padding: 18, border: "1px solid #3c3324", background: "#17130d", color: "#d6a85f" }}>
            Projet prêt à être enregistré. La prochaine étape est l’assistant de développement IA.
          </div>
        ) : (
          <button type="submit" style={{ background: "#d6a85f", color: "#111", border: 0, padding: "16px 22px", borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Lancer le développement →
          </button>
        )}
      </form>
    </main>
  );
}

const inputStyle = { width: "100%", padding: "14px 15px", borderRadius: 6, border: "1px solid #333", background: "#111116", color: "#f5f5f5", fontSize: 15, outline: "none" };
const choiceStyle = { padding: "18px 12px", border: "1px solid", borderRadius: 6, color: "#f5f5f5", cursor: "pointer", fontSize: 15 };
