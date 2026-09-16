export type FundingPackageId =
  | "funding_dossier"
  | "producer_package"
  | "broadcaster_package"
  | "african_fund_package"
  | "institutional_package"
  | "investor_package"
  | "pitch_package";

export type FundingPackage = {
  id: FundingPackageId;
  label: string;
  description: string;
  audience: string;
  requiredDocuments: string[];
  optionalDocuments: string[];
  workflowGoal: string;
};

export const FUNDING_PACKAGES: FundingPackage[] = [
  {
    id: "funding_dossier",
    label: "Dossier de financement",
    description: "Dossier complet destiné à une commission ou un financeur audiovisuel.",
    audience: "Fonds, commissions, coproducteurs, institutions",
    requiredDocuments: ["synopsis", "intent_note", "director_note", "production_schedule", "budget", "financing_plan", "pitch_deck"],
    optionalDocuments: ["bible", "scenario", "technical_breakdown"],
    workflowGoal: "Préparer le dossier complet de financement du projet",
  },
  {
    id: "producer_package",
    label: "Dossier producteur",
    description: "Package orienté production, faisabilité, ressources et risques.",
    audience: "Producteurs et sociétés de production",
    requiredDocuments: ["synopsis", "director_note", "production_schedule", "budget", "financing_plan"],
    optionalDocuments: ["bible", "technical_breakdown", "pitch_deck"],
    workflowGoal: "Préparer un package de production exploitable par un producteur",
  },
  {
    id: "broadcaster_package",
    label: "Dossier diffuseur",
    description: "Package éditorial et commercial adapté à un diffuseur ou une plateforme.",
    audience: "TV, plateformes, diffuseurs",
    requiredDocuments: ["synopsis", "pitch_deck", "director_note"],
    optionalDocuments: ["bible", "scenario", "production_schedule"],
    workflowGoal: "Préparer un package de présentation destiné à un diffuseur",
  },
  {
    id: "african_fund_package",
    label: "Dossier fonds africain",
    description: "Package mettant en évidence pertinence culturelle, impact et faisabilité régionale.",
    audience: "Fonds et programmes africains",
    requiredDocuments: ["synopsis", "intent_note", "director_note", "budget", "financing_plan"],
    optionalDocuments: ["production_schedule", "pitch_deck", "bible"],
    workflowGoal: "Préparer un dossier de candidature pour un fonds audiovisuel africain",
  },
  {
    id: "institutional_package",
    label: "Dossier institutionnel",
    description: "Présentation structurée pour partenaires publics, ONG et institutions.",
    audience: "Institutions, ONG, partenaires publics",
    requiredDocuments: ["synopsis", "intent_note", "production_schedule", "budget"],
    optionalDocuments: ["pitch_deck", "financing_plan"],
    workflowGoal: "Préparer un dossier institutionnel clair et vérifiable",
  },
  {
    id: "investor_package",
    label: "Investor / Business package",
    description: "Package centré sur modèle économique, marché, financement et retour attendu.",
    audience: "Investisseurs et partenaires privés",
    requiredDocuments: ["pitch_deck", "budget", "financing_plan", "production_schedule"],
    optionalDocuments: ["synopsis", "director_note"],
    workflowGoal: "Préparer un package audiovisuel destiné à des investisseurs privés",
  },
  {
    id: "pitch_package",
    label: "Pitch package",
    description: "Package court pour présenter rapidement le projet et obtenir un rendez-vous.",
    audience: "Producteurs, diffuseurs, investisseurs, festivals",
    requiredDocuments: ["synopsis", "pitch_deck"],
    optionalDocuments: ["director_note", "budget", "financing_plan"],
    workflowGoal: "Préparer un package de pitch court et convaincant",
  },
];

export function getFundingPackage(id: string) {
  return FUNDING_PACKAGES.find((item) => item.id === id);
}
