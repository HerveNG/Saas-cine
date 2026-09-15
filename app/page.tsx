const features = [
  { title: "Développer", text: "Transformez une idée en synopsis, notes d’auteur et dossier professionnel." },
  { title: "Financer", text: "Identifiez les fonds, appels à projets, résidences et bourses adaptés." },
  { title: "Produire", text: "Préparez budget, plan de financement et calendrier de production." },
  { title: "Améliorer", text: "Analysez la cohérence et les points forts de votre dossier avec l’IA." },
];

export default function Home() {
  return (
    <main>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 6vw", borderBottom: "1px solid #222" }}>
        <strong style={{ letterSpacing: "0.08em" }}>FILMFUND AFRICA</strong>
        <div style={{ display: "flex", gap: 24, color: "#a1a1aa", fontSize: 14 }}>
          <a href="#features">Fonctionnalités</a>
          <a href="#pricing">Tarifs</a>
          <a href="/login">Connexion</a>
        </div>
      </nav>

      <section style={{ minHeight: "72vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 10vw", maxWidth: 1200 }}>
        <p style={{ color: "#d6a85f", letterSpacing: "0.18em", fontSize: 13, fontWeight: 700 }}>DE L’IDÉE AU FINANCEMENT</p>
        <h1 style={{ fontSize: "clamp(3.2rem, 8vw, 7rem)", lineHeight: 0.95, margin: "20px 0", letterSpacing: "-0.06em" }}>
          Donnez une<br />production à<br />votre histoire.
        </h1>
        <p style={{ maxWidth: 620, color: "#a1a1aa", fontSize: 20, lineHeight: 1.6 }}>
          FilmFund Africa accompagne les auteurs et producteurs africains de la première idée jusqu’au dossier professionnel et aux opportunités de financement.
        </p>
        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          <a href="/register" style={{ background: "#d6a85f", color: "#111", padding: "15px 24px", borderRadius: 6, fontWeight: 700 }}>
            Commencer mon projet
          </a>
          <a href="#features" style={{ border: "1px solid #333", padding: "15px 24px", borderRadius: 6 }}>
            Découvrir la plateforme
          </a>
        </div>
      </section>

      <section id="features" style={{ padding: "80px 6vw", borderTop: "1px solid #222" }}>
        <p style={{ color: "#d6a85f", fontSize: 13, letterSpacing: "0.15em" }}>UNE PLATEFORME, TOUT LE CYCLE DU PROJET</p>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 4rem)", margin: "12px 0 48px", letterSpacing: "-0.04em" }}>Construire. Financer. Produire.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1, background: "#2a2a2a" }}>
          {features.map((feature, index) => (
            <article key={feature.title} style={{ background: "#0b0b0f", padding: 30, minHeight: 220 }}>
              <span style={{ color: "#666", fontSize: 12 }}>0{index + 1}</span>
              <h3 style={{ fontSize: 24, margin: "30px 0 12px" }}>{feature.title}</h3>
              <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ padding: "80px 6vw", borderTop: "1px solid #222" }}>
        <p style={{ color: "#d6a85f", fontSize: 13, letterSpacing: "0.15em" }}>POUR CHAQUE ÉTAPE DE VOTRE PARCOURS</p>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 4rem)", margin: "12px 0 40px", letterSpacing: "-0.04em" }}>Commencez gratuitement.</h2>
        <p style={{ color: "#a1a1aa", maxWidth: 650, lineHeight: 1.7 }}>Le modèle tarifaire complet sera intégré avec les offres Auteur, Producteur et Institution, ainsi que la veille personnalisée et les exports professionnels.</p>
      </section>

      <footer style={{ padding: "30px 6vw", borderTop: "1px solid #222", color: "#666", fontSize: 13 }}>
        © 2026 FilmFund Africa — De l’idée au financement.
      </footer>
    </main>
  );
}
