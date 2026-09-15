import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "../../../lib/supabase-server";

const documentLabels: Record<string, string> = { synopsis: "Synopsis", intent_note: "Note d’intention", director_note: "Note de réalisation", bible: "Bible du projet", pitch_deck: "Pitch deck", scenario: "Scénario", technical_breakdown: "Dépouillement technique", budget: "Budget", financing_plan: "Plan de financement", production_schedule: "Planning de production" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: project }, { data: details }, { data: characters }, { data: documents }] = await Promise.all([
    supabase.from("projects").select("id,title,type,genre,duration_minutes,country,language,theme,target_audience,logline,status,progress,updated_at").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("project_details").select("concept,story,creative_vision,production_context,additional_notes").eq("project_id", id).maybeSingle(),
    supabase.from("characters").select("id,name,role,age,biography,personality,psychology,evolution").eq("project_id", id).order("created_at", { ascending: true }),
    supabase.from("documents").select("id,type,title,status,current_version,updated_at").eq("project_id", id).order("updated_at", { ascending: false }),
  ]);
  if (!project) notFound();
  return (
    <main style={{ minHeight: "100vh", padding: "32px 5vw 70px", maxWidth: 1400, margin: "0 auto" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Link href="/dashboard" style={{ color: "#a1a1aa", fontSize: 14 }}>← Dashboard</Link><Link href="/projects/new" style={{ color: "#d6a85f", fontSize: 14 }}>+ Nouveau projet</Link></nav>
      <header style={{ marginTop: 48, paddingBottom: 28, borderBottom: "1px solid #27272a" }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 11 }}>ESPACE PROJET · {project.type.toUpperCase()}</p><h1 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", letterSpacing: "-0.05em", lineHeight: 1, margin: "14px 0" }}>{project.title}</h1><p style={{ color: "#a1a1aa", maxWidth: 780, lineHeight: 1.7 }}>{project.logline || project.theme || "Projet en cours de développement."}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{[project.genre, project.country, project.language, project.duration_minutes ? `${project.duration_minutes} min` : null].filter(Boolean).map((item) => <span key={item} style={tagStyle}>{item}</span>)}<span style={tagStyle}>Progression {project.progress}%</span></div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}><Link href={`/projects/${id}/assistant`} style={actionStyle}>✦ Ouvrir l’assistant IA</Link><Link href={`/projects/${id}/documents`} style={secondaryActionStyle}>Documents</Link><Link href={`/projects/${id}/characters`} style={secondaryActionStyle}>Personnages</Link><Link href={`/projects/${id}/edit`} style={secondaryActionStyle}>Modifier le projet</Link></div>
      </header>
      <section style={gridStyle}><div style={cardStyle}><div style={sectionHeader}><h2>Identité du projet</h2><span>{project.status}</span></div><Info label="Genre" value={project.genre} /><Info label="Pays" value={project.country} /><Info label="Langue" value={project.language} /><Info label="Public cible" value={project.target_audience} /><Info label="Durée" value={project.duration_minutes ? `${project.duration_minutes} minutes` : null} /><Info label="Logline" value={project.logline} /></div><div style={cardStyle}><div style={sectionHeader}><h2>Vision éditoriale</h2><span>Développement</span></div><TextBlock title="Concept" value={details?.concept || project.theme} /><TextBlock title="Histoire" value={details?.story} /><TextBlock title="Vision créative" value={details?.creative_vision} /><TextBlock title="Contexte de production" value={details?.production_context} /></div></section>
      <section style={{ ...cardStyle, marginTop: 24 }}><div style={sectionHeader}><h2>Personnages</h2><span>{characters?.length ?? 0} personnage(s)</span></div>{characters?.length ? <div style={listGrid}>{characters.map((character) => <article key={character.id} style={itemStyle}><h3>{character.name}</h3><p style={{ color: "#d6a85f" }}>{character.role || "Personnage"}{character.age ? ` · ${character.age} ans` : ""}</p><p style={muted}>{character.biography || character.personality || "Fiche à développer."}</p></article>)}</div> : <Empty text="Aucun personnage pour le moment." />}</section>
      <section style={{ ...cardStyle, marginTop: 24 }}><div style={sectionHeader}><h2>Documents de développement</h2><span>{documents?.length ?? 0} document(s)</span></div>{documents?.length ? <div style={listGrid}>{documents.map((document) => <article key={document.id} style={itemStyle}><p style={{ color: "#d6a85f", fontSize: 11 }}>{documentLabels[document.type] || document.type}</p><h3>{document.title}</h3><p style={muted}>Version {document.current_version} · {document.status}</p></article>)}</div> : <Empty text="Aucun document n’est encore créé." />}</section>
    </main>
  );
}
function Info({ label, value }: { label: string; value: string | number | null | undefined }) { return <div style={{ padding: "12px 0", borderBottom: "1px solid #242428" }}><div style={{ color: "#71717a", fontSize: 12 }}>{label}</div><div style={{ marginTop: 5 }}>{value || "—"}</div></div>; }
function TextBlock({ title, value }: { title: string; value?: string | null }) { if (!value) return null; return <div style={{ marginBottom: 20 }}><h3 style={{ fontSize: 13, color: "#d6a85f" }}>{title}</h3><p style={{ ...muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p style={{ ...muted, lineHeight: 1.7 }}>{text}</p>; }
const muted = { color: "#a1a1aa", fontSize: 14 }; const tagStyle = { border: "1px solid #333", background: "#111116", padding: "7px 10px", borderRadius: 999, color: "#d4d4d8", fontSize: 12 }; const cardStyle = { border: "1px solid #27272a", background: "#0f0f13", borderRadius: 10, padding: 24 }; const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginTop: 24 }; const sectionHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, marginBottom: 18 }; const listGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }; const itemStyle = { border: "1px solid #27272a", borderRadius: 8, padding: 18, background: "#121217" }; const actionStyle = { background: "#d6a85f", color: "#09090b", padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 700 }; const secondaryActionStyle = { border: "1px solid #333", color: "#d4d4d8", padding: "10px 14px", borderRadius: 7, fontSize: 13 };
