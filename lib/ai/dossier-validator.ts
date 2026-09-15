export type DossierDocument = {
  type: string;
  title: string;
  content: string | null;
  status: string;
};

export type DossierCheck = {
  code: string;
  label: string;
  status: "ok" | "warning" | "missing";
  detail: string;
};

const REQUIRED: Array<[string, string]> = [
  ["synopsis", "Synopsis"],
  ["director_note", "Note de réalisation"],
  ["production_schedule", "Planning de production"],
  ["budget", "Budget"],
  ["financing_plan", "Plan de financement"],
  ["pitch_deck", "Pitch deck"],
];

function hasMeaningfulContent(content: string | null) {
  return Boolean(content && content.trim().length >= 120);
}

function hasPlaceholder(content: string) {
  return /(TODO|TBD|À COMPLÉTER|A COMPLÉTER|PLACEHOLDER|XXX|\[à compléter\]|\[a completer\])/i.test(content);
}

function extractAmounts(text: string) {
  return [...text.matchAll(/(?:^|[^\d])([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{4,})(?:\s*(?:FCFA|XAF|€|EUR|USD|\$))?/gi)]
    .map((match) => Number(match[1].replace(/[ .]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function validateFundingDossier(documents: DossierDocument[]) {
  const checks: DossierCheck[] = [];
  const byType = new Map(documents.map((doc) => [doc.type, doc]));

  for (const [type, label] of REQUIRED) {
    const doc = byType.get(type);
    if (!doc) {
      checks.push({ code: `missing_${type}`, label, status: "missing", detail: `Le document « ${label} » n'existe pas encore.` });
      continue;
    }
    if (!hasMeaningfulContent(doc.content)) {
      checks.push({ code: `empty_${type}`, label, status: "warning", detail: `Le document « ${doc.title} » existe mais son contenu est insuffisant pour un dossier professionnel.` });
      continue;
    }
    if (hasPlaceholder(doc.content || "")) {
      checks.push({ code: `placeholder_${type}`, label, status: "warning", detail: `Le document « ${doc.title} » contient encore au moins un placeholder ou élément à compléter.` });
      continue;
    }
    checks.push({ code: `ok_${type}`, label, status: "ok", detail: `Le document « ${doc.title} » possède un contenu exploitable.` });
  }

  const budget = byType.get("budget")?.content || "";
  const financing = byType.get("financing_plan")?.content || "";
  if (budget && financing) {
    const budgetAmounts = extractAmounts(budget);
    const financingAmounts = extractAmounts(financing);
    if (!budgetAmounts.length || !financingAmounts.length) {
      checks.push({ code: "financial_amounts", label: "Cohérence financière", status: "warning", detail: "Les documents financiers ne contiennent pas suffisamment de montants détectables pour effectuer un contrôle arithmétique automatique." });
    } else {
      const maxBudget = Math.max(...budgetAmounts);
      const maxFinancing = Math.max(...financingAmounts);
      const ratio = maxBudget ? Math.abs(maxFinancing - maxBudget) / maxBudget : 1;
      checks.push({
        code: "financial_amounts",
        label: "Cohérence financière",
        status: ratio <= 0.05 ? "ok" : "warning",
        detail: ratio <= 0.05
          ? "Les principaux montants détectés dans le budget et le plan de financement sont proches. Une vérification humaine reste nécessaire."
          : "Les principaux montants détectés dans le budget et le plan de financement semblent différer. Vérifier les besoins, apports et sources de financement.",
      });
    }
  }

  const missing = checks.filter((check) => check.status === "missing").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const ready = missing === 0 && warnings === 0;

  return {
    ready,
    summary: ready
      ? "Le dossier passe les contrôles automatiques de complétude et de cohérence de premier niveau."
      : `${missing} élément(s) manquant(s) et ${warnings} point(s) à vérifier avant de considérer le dossier comme prêt.`,
    checks,
    checkedAt: new Date().toISOString(),
  };
}
