"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Check = { code: string; label: string; status: "ok" | "warning" | "missing"; detail: string };
type Result = { ready: boolean; summary: string; checks: Check[]; checkedAt: string };
type Package = { id: string; label: string; description: string };

const icons = { ok: "✓", warning: "!", missing: "×" };
const labels = { ok: "Validé", warning: "À vérifier", missing: "Manquant" };

export default function ValidatePage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [packageId, setPackageId] = useState("funding_dossier");
  const [pkg, setPkg] = useState<Package | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setProjectId(id);
      const selected = new URLSearchParams(window.location.search).get("package") || "funding_dossier";
      setPackageId(selected);
      load(id, selected);
    });
  }, [params]);

  async function load(id: string, selected: string) {
    setLoading(true); setError("");
    const response = await fetch(`/api/projects/${id}/dossier/validate?package=${encodeURIComponent(selected)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "Impossible de valider le dossier.");
    else { setPkg(data.package); setResult(data.validation); }
    setLoading(false);
  }

  const ok = result?.checks.filter(c => c.status === "ok").length ?? 0;
  const warnings = result?.checks.filter(c => c.status === "warning").length ?? 0;
  const missing = result?.checks.filter(c => c.status === "missing").length ?? 0;

  return <main style={{ minHeight: "100vh", padding: "32px 5vw", color: "#eee" }}>
    <div style={{ maxWidth: 1050, margin: "0 auto" }}>
      <Link href={`/projects/${projectId}/dossier/packages`} style={{ color: "#999" }}>← Packages</Link>
      <header style={{ margin: "45px 0 30px" }}>
        <div style={{ color: "#d6a85f", fontSize: 11, letterSpacing: ".18em", fontWeight: 700 }}>FINAL QA · DOSSIER</div>
        <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", margin: "8px 0", letterSpacing: "-.05em" }}>Validation finale.</h1>
        {pkg && <><h2 style={{ margin: "8px 0", fontSize: 18 }}>{pkg.label}</h2><p style={{ color: "#888", lineHeight: 1.6 }}>{pkg.description}</p></>}
      </header>

      {loading && <div style={panel}>Contrôle du dossier en cours…</div>}
      {error && <div style={{ ...panel, color: "#e0a08c", borderColor: "#633b32" }}>{error}</div>}

      {result && <><section style={{ ...panel, borderColor: result.ready ? "#536b50" : "#6b5230", background: result.ready ? "#101610" : "#15120d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div><div style={{ color: result.ready ? "#9ac7a0" : "#d6a85f", fontWeight: 700 }}>{result.ready ? "DOSSIER PRÊT" : "ACTIONS REQUISES"}</div><p style={{ color: "#aaa", maxWidth: 700, lineHeight: 1.6 }}>{result.summary}</p></div>
          <div style={{ display: "flex", gap: 8 }}><Stat n={ok} label="validés" /><Stat n={warnings} label="à vérifier" /><Stat n={missing} label="manquants" /></div>
        </div>
      </section>

      <section style={{ marginTop: 14, display: "grid", gap: 9 }}>
        {result.checks.map(check => <article key={check.code} style={{ ...panel, padding: 16, borderColor: check.status === "ok" ? "#29362a" : check.status === "warning" ? "#514027" : "#4b302c" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", background: check.status === "ok" ? "#26352a" : check.status === "warning" ? "#392f1e" : "#3a2421", color: check.status === "ok" ? "#9ac7a0" : check.status === "warning" ? "#d6a85f" : "#df8f80", fontWeight: 800 }}>{icons[check.status]}</span>
            <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{check.label}</strong><small style={{ color: "#777" }}>{labels[check.status]}</small></div><p style={{ color: "#999", lineHeight: 1.55, marginBottom: 0 }}>{check.detail}</p></div>
          </div>
        </article>)}
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
        {!result.ready && <Link href={`/projects/${projectId}/assistant`} style={button}>Corriger avec l’IA</Link>}
        <Link href={`/projects/${projectId}/dossier/packages`} style={secondary}>Changer de package</Link>
        {result.ready && <a href={`/api/projects/${projectId}/dossier/export?package=${encodeURIComponent(packageId)}`} style={button}>Exporter le PDF final</a>}
        <button onClick={() => load(projectId, packageId)} style={secondaryButton}>Recontrôler</button>
      </div>
      <div style={{ color: "#555", fontSize: 11, marginTop: 20 }}>Contrôle effectué le {new Date(result.checkedAt).toLocaleString("fr-FR")}. La validation automatique reste un contrôle de premier niveau et ne remplace pas la relecture professionnelle.</div>
      </>}
    </div>
  </main>;
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div style={{ minWidth: 72, textAlign: "center" }}><strong style={{ display: "block", fontSize: 22 }}>{n}</strong><small style={{ color: "#777" }}>{label}</small></div>;
}

const panel = { border: "1px solid #292929", borderRadius: 10, padding: 22, background: "#0d0d11" };
const button = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#d6a85f", color: "#111", textDecoration: "none", fontWeight: 700, fontSize: 13 };
const secondary = { display: "inline-block", padding: "11px 16px", borderRadius: 6, background: "#171717", border: "1px solid #333", color: "#ddd", textDecoration: "none", fontSize: 13 };
const secondaryButton = { padding: "11px 16px", borderRadius: 6, background: "#171717", border: "1px solid #333", color: "#ddd", cursor: "pointer", fontSize: 13 };
