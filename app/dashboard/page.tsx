import { getSupabaseServerClient } from "../../lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: projects }, { data: opportunities }, { count: documentCount }] = await Promise.all([
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("projects").select("id,title,type,progress,status,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("opportunities").select("id,title,type,deadline,country").eq("status", "active").order("deadline", { ascending: true }).limit(5),
    user ? supabase.from("documents").select("id", { count: "exact", head: true }).in("project_id", (projects ?? []).map((p) => p.id)) : Promise.resolve({ count: 0 }),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: "32px 5vw" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", paddingBottom: 22 }}>
        <a href="/" style={{ fontWeight: 700, letterSpacing: "0.08em" }}>FILMFUND AFRICA</a>
        <nav style={{ display: "flex", gap: 22, color: "#a1a1aa", fontSize: 14 }}>
          <a href="/dashboard" style={{ color: "#f5f5f5" }}>Dashboard</a><a href="/projects/new">Nouveau projet</a><a href="/opportunities">Opportunités</a>
        </nav>
      </header>
      <section style={{ padding: "60px 0 40px" }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.16em", fontSize: 12 }}>ESPACE DE TRAVAIL</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 30, alignItems: "end", flexWrap: "wrap" }}>
          <div><h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", letterSpacing: "-0.05em", margin: "12px 0" }}>Bonjour{profile?.full_name ? `, ${profile.full_name}` : ""}.</h1><p style={{ color: "#a1a1aa", maxWidth: 600 }}>Développez vos projets, préparez vos dossiers et suivez les opportunités de financement.</p></div>
          <a href="/projects/new" style={{ background: "#d6a85f", color: "#111", padding: "14px 20px", borderRadius: 6, fontWeight: 700 }}>+ Nouveau projet</a>
        </div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#292929", marginBottom: 55 }}>
        {[["01", "Projets", String(projects?.length ?? 0)], ["02", "Documents", String(documentCount ?? 0)], ["03", "Opportunités", String(opportunities?.length ?? 0)]].map(([n, label, value]) => <div key={label} style={{ background: "#0b0b0f", padding: 25 }}><span style={{ color: "#666", fontSize: 12 }}>{n}</span><div style={{ fontSize: 36, marginTop: 25 }}>{value}</div><div style={{ color: "#a1a1aa", marginTop: 6 }}>{label}</div></div>)}
      </section>
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ margin: 0 }}>Mes projets</h2><a href="/projects/new" style={{ color: "#d6a85f", fontSize: 14 }}>Créer un projet →</a></div>
        <div style={{ display: "grid", gap: 12 }}>
          {(projects ?? []).length === 0 ? <p style={{ color: "#777" }}>Aucun projet pour le moment.</p> : projects?.map((project) => <article key={project.id} style={{ border: "1px solid #292929", padding: 24, borderRadius: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}><div><span style={{ color: "#d6a85f", fontSize: 12 }}>{project.type}</span><h3 style={{ margin: "8px 0" }}>{project.title}</h3><span style={{ color: "#a1a1aa", fontSize: 13 }}>{project.status}</span></div><div style={{ minWidth: 200 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#a1a1aa" }}><span>Progression</span><span>{project.progress}%</span></div><div style={{ height: 5, background: "#292929", marginTop: 10 }}><div style={{ width: `${project.progress}%`, height: "100%", background: "#d6a85f" }} /></div></div></div></article>)}
        </div>
      </section>
      <section style={{ marginTop: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ margin: 0 }}>Veille financement</h2><a href="/opportunities" style={{ color: "#d6a85f", fontSize: 14 }}>Voir tout →</a></div>
        <div style={{ display: "grid", gap: 10 }}>{(opportunities ?? []).map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 150px", gap: 20, borderTop: "1px solid #292929", padding: "18px 0", alignItems: "center" }}><div><strong>{item.title}</strong><div style={{ color: "#777", fontSize: 13, marginTop: 5 }}>{item.country ?? "International"}</div></div><span style={{ color: "#a1a1aa", fontSize: 13 }}>{item.type}</span><span style={{ color: "#a1a1aa", fontSize: 13 }}>{item.deadline ? new Date(item.deadline).toLocaleDateString("fr-FR") : "À venir"}</span></div>)}</div>
      </section>
    </main>
  );
}
