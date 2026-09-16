import type { AIRole } from "./roles";
import type { FundingPackageId } from "./funding-packages";

export type AgentTask = {
  role: AIRole;
  objective: string;
  output: string;
  dependsOn?: number[];
};

export type AgentWorkflow = {
  title: string;
  summary: string;
  tasks: AgentTask[];
};

const WORKFLOWS: Array<{ test: RegExp; title: string; summary: string; tasks: AgentTask[] }> = [
  {
    test: /(dossier de financement|dossier financement|funding dossier|funding package)/i,
    title: "Génération du dossier de financement",
    summary: "Construit progressivement un dossier de financement professionnel à partir des données du projet, avec validation humaine avant toute création ou modification de document.",
    tasks: [
      { role: "development", objective: "Auditer le projet, identifier ses forces, lacunes, incohérences et informations manquantes. Préparer la structure éditoriale du dossier.", output: "Diagnostic et architecture du dossier" },
      { role: "screenwriter", objective: "Produire les éléments narratifs destinés au dossier : logline, synopsis court, synopsis détaillé et présentation des personnages lorsque les données disponibles le permettent. Proposer la création ou mise à jour des documents narratifs correspondants.", output: "Pack narratif du dossier", dependsOn: [0] },
      { role: "director", objective: "Rédiger la note de réalisation et formaliser la vision artistique : intention, traitement, mise en scène, image, son et parti pris esthétique, sans inventer de faits absents du projet.", output: "Note de réalisation", dependsOn: [0, 1] },
      { role: "producer", objective: "Structurer le cadre de production : format, besoins principaux, étapes, ressources, hypothèses budgétaires, risques et éléments à confirmer. Proposer les documents de production pertinents.", output: "Cadre de production", dependsOn: [0] },
      { role: "financing", objective: "Construire le plan de financement à partir des éléments narratifs, artistiques et de production validés. Distinguer clairement les données connues, hypothèses et montants à confirmer.", output: "Plan de financement", dependsOn: [1, 2, 3] },
      { role: "producer", objective: "Assembler un budget prévisionnel cohérent avec le format et le cadre de production. Signaler les hypothèses financières et proposer la création ou mise à jour du document budget.", output: "Budget prévisionnel", dependsOn: [3, 4] },
      { role: "financing", objective: "Effectuer le contrôle de cohérence final du dossier : adéquation projet/budget/financement, pièces manquantes, risques et informations à vérifier avant soumission.", output: "Contrôle de cohérence financement", dependsOn: [4, 5] },
      { role: "producer", objective: "Préparer la checklist finale de soumission et la structure du pitch deck : documents requis, ordre de présentation, points à défendre et éléments encore à compléter.", output: "Checklist et structure du pitch", dependsOn: [6] },
    ],
  },
  {
    test: /(financement|financer|fonds|funding)/i,
    title: "Préparation au financement",
    summary: "Prépare les éléments créatifs, de production et financiers nécessaires à une recherche de financement.",
    tasks: [
      { role: "development", objective: "Clarifier la promesse, le positionnement, le public cible et les éléments manquants du projet.", output: "Diagnostic de développement" },
      { role: "screenwriter", objective: "Structurer ou améliorer la logline, le synopsis et les éléments narratifs utiles au dossier.", output: "Pack narratif", dependsOn: [0] },
      { role: "director", objective: "Structurer la vision artistique et les intentions de mise en scène à partir des données existantes.", output: "Note de réalisation", dependsOn: [0] },
      { role: "producer", objective: "Identifier les besoins de production, hypothèses de budget, ressources, risques et étapes à documenter.", output: "Cadre de production", dependsOn: [0] },
      { role: "financing", objective: "Assembler les besoins de financement et définir les pièces nécessaires à un dossier cohérent.", output: "Plan de financement", dependsOn: [1, 2, 3] },
    ],
  },
  {
    test: /(dossier|pitch|présentation|presenter|présenter)/i,
    title: "Préparation du dossier projet",
    summary: "Organise les contenus essentiels pour présenter le projet à un partenaire professionnel.",
    tasks: [
      { role: "development", objective: "Évaluer la clarté et le positionnement du projet.", output: "Diagnostic projet" },
      { role: "screenwriter", objective: "Consolider les éléments narratifs et la présentation de l'histoire.", output: "Synthèse narrative", dependsOn: [0] },
      { role: "director", objective: "Définir la vision artistique à présenter.", output: "Vision artistique", dependsOn: [0] },
      { role: "producer", objective: "Définir les éléments de production à présenter.", output: "Cadre de production", dependsOn: [0] },
    ],
  },
];

const PACKAGE_WORKFLOWS: Record<FundingPackageId, AgentWorkflow> = {
  funding_dossier: {
    title: "Production IA · Dossier de financement",
    summary: "Pipeline complet de production, contrôle et préparation à la soumission d'un dossier de financement.",
    tasks: [
      { role: "development", objective: "Diagnostiquer le projet et définir la structure exacte du dossier de financement.", output: "Diagnostic et architecture" },
      { role: "screenwriter", objective: "Finaliser la logline et le synopsis professionnel du projet.", output: "Pack narratif", dependsOn: [0] },
      { role: "director", objective: "Finaliser la note d'intention et la note de réalisation adaptées au projet.", output: "Note de réalisation", dependsOn: [0, 1] },
      { role: "producer", objective: "Construire le plan de production, les ressources, étapes, risques et hypothèses de faisabilité.", output: "Cadre de production", dependsOn: [0] },
      { role: "financing", objective: "Construire le plan de financement à partir des livrables créatifs et de production.", output: "Plan de financement", dependsOn: [1, 2, 3] },
      { role: "producer", objective: "Construire le budget prévisionnel cohérent avec le format et les hypothèses de production.", output: "Budget prévisionnel", dependsOn: [3, 4] },
      { role: "validator", objective: "Contrôler la cohérence globale entre narration, vision, production, budget et financement. Produire une liste précise de corrections.", output: "Validation de cohérence", dependsOn: [1, 2, 3, 4, 5] },
      { role: "producer", objective: "Préparer la checklist finale et la structure du pitch deck à partir du contrôle de cohérence.", output: "Checklist et pitch", dependsOn: [6] },
    ],
  },
  producer_package: {
    title: "Production IA · Dossier producteur",
    summary: "Package centré sur faisabilité, production, budget et financement.",
    tasks: [
      { role: "development", objective: "Clarifier le projet, son format, son positionnement et les informations manquantes pour un producteur.", output: "Diagnostic producteur" },
      { role: "screenwriter", objective: "Consolider le synopsis et les éléments narratifs indispensables à l'évaluation du projet.", output: "Synopsis producteur", dependsOn: [0] },
      { role: "director", objective: "Formaliser les choix artistiques indispensables à la compréhension du projet.", output: "Vision artistique", dependsOn: [0, 1] },
      { role: "producer", objective: "Construire le plan de production, ressources, calendrier et risques.", output: "Cadre de production", dependsOn: [0] },
      { role: "financing", objective: "Structurer le plan de financement compatible avec le cadre de production.", output: "Plan de financement", dependsOn: [3] },
      { role: "producer", objective: "Construire le budget prévisionnel et contrôler son articulation avec le financement.", output: "Budget prévisionnel", dependsOn: [3, 4] },
      { role: "validator", objective: "Contrôler la faisabilité et la cohérence des pièces avant présentation au producteur.", output: "Validation producteur", dependsOn: [1, 2, 3, 4, 5] },
    ],
  },
  broadcaster_package: {
    title: "Production IA · Dossier diffuseur",
    summary: "Package éditorial et commercial adapté à une chaîne, une plateforme ou un diffuseur.",
    tasks: [
      { role: "development", objective: "Clarifier concept, public cible, promesse éditoriale et format.", output: "Positionnement diffuseur" },
      { role: "screenwriter", objective: "Produire un synopsis et une présentation narrative immédiatement lisibles par un diffuseur.", output: "Pack éditorial", dependsOn: [0] },
      { role: "director", objective: "Présenter la vision artistique et le traitement audiovisuel du programme.", output: "Note de réalisation", dependsOn: [0, 1] },
      { role: "producer", objective: "Formaliser les principaux éléments de production et de faisabilité.", output: "Cadre de production", dependsOn: [0] },
      { role: "validator", objective: "Contrôler cohérence, lisibilité et complétude du package diffuseur.", output: "Validation diffuseur", dependsOn: [1, 2, 3] },
      { role: "producer", objective: "Structurer le pitch deck et la présentation finale destinée au rendez-vous professionnel.", output: "Pitch diffuseur", dependsOn: [4] },
    ],
  },
  african_fund_package: {
    title: "Production IA · Fonds africain",
    summary: "Pipeline intégrant pertinence culturelle, impact, faisabilité et cohérence financière.",
    tasks: [
      { role: "development", objective: "Diagnostiquer le projet et identifier les axes de pertinence culturelle et territoriale à documenter.", output: "Diagnostic fonds africain" },
      { role: "screenwriter", objective: "Finaliser synopsis, logline et éléments narratifs adaptés à une commission de financement.", output: "Pack narratif", dependsOn: [0] },
      { role: "director", objective: "Formaliser la vision artistique et l'ancrage culturel du traitement audiovisuel.", output: "Note de réalisation", dependsOn: [0, 1] },
      { role: "producer", objective: "Établir faisabilité, ressources, calendrier, risques et capacité de production régionale.", output: "Cadre de production", dependsOn: [0] },
      { role: "financing", objective: "Construire le plan de financement et distinguer clairement acquis, demandes et hypothèses.", output: "Plan de financement", dependsOn: [3] },
      { role: "producer", objective: "Construire un budget prévisionnel cohérent et traçable.", output: "Budget prévisionnel", dependsOn: [3, 4] },
      { role: "impact", objective: "Évaluer pertinence culturelle, ancrage africain, publics concernés, transmission et impact potentiel sans inventer de résultats déjà obtenus.", output: "Impact culturel et territorial", dependsOn: [0, 1, 2, 3] },
      { role: "validator", objective: "Contrôler la cohérence finale entre contenu, culture, production, budget et financement et produire les corrections nécessaires.", output: "Validation fonds africain", dependsOn: [4, 5, 6] },
      { role: "producer", objective: "Préparer la checklist de candidature et la structure du pitch final.", output: "Checklist fonds africain", dependsOn: [7] },
    ],
  },
  institutional_package: {
    title: "Production IA · Dossier institutionnel",
    summary: "Package structuré pour partenaires publics, ONG et institutions.",
    tasks: [
      { role: "development", objective: "Clarifier objectifs, publics, contexte et proposition de valeur institutionnelle.", output: "Cadrage institutionnel" },
      { role: "screenwriter", objective: "Produire un synopsis clair et factuel.", output: "Synopsis institutionnel", dependsOn: [0] },
      { role: "producer", objective: "Structurer calendrier, ressources, livrables et faisabilité.", output: "Plan de production", dependsOn: [0] },
      { role: "financing", objective: "Présenter besoins, financement et hypothèses de manière vérifiable.", output: "Plan de financement", dependsOn: [2] },
      { role: "validator", objective: "Contrôler la cohérence et la vérifiabilité du dossier institutionnel.", output: "Validation institutionnelle", dependsOn: [1, 2, 3] },
    ],
  },
  investor_package: {
    title: "Production IA · Investor / Business package",
    summary: "Package orienté modèle économique, financement, production et présentation investisseur.",
    tasks: [
      { role: "development", objective: "Clarifier proposition de valeur, public, positionnement et potentiel du projet.", output: "Cadrage business" },
      { role: "producer", objective: "Structurer production, ressources, calendrier, risques et hypothèses.", output: "Plan de production", dependsOn: [0] },
      { role: "financing", objective: "Construire le besoin de financement et la structure financière sans inventer de rendement garanti.", output: "Plan de financement", dependsOn: [0, 1] },
      { role: "producer", objective: "Construire le budget prévisionnel et ses hypothèses.", output: "Budget prévisionnel", dependsOn: [1, 2] },
      { role: "screenwriter", objective: "Consolider le synopsis pour donner à l'investisseur une compréhension rapide du projet.", output: "Synopsis investisseur", dependsOn: [0] },
      { role: "validator", objective: "Contrôler cohérence économique, financière, narrative et productive.", output: "Validation investisseur", dependsOn: [1, 2, 3, 4] },
      { role: "producer", objective: "Assembler le pitch deck et les messages clés de présentation.", output: "Pitch investisseur", dependsOn: [5] },
    ],
  },
  pitch_package: {
    title: "Production IA · Pitch package",
    summary: "Pipeline court pour obtenir rapidement une présentation professionnelle du projet.",
    tasks: [
      { role: "development", objective: "Clarifier promesse, public et angle de présentation.", output: "Cadrage du pitch" },
      { role: "screenwriter", objective: "Finaliser logline et synopsis court.", output: "Pack narratif", dependsOn: [0] },
      { role: "director", objective: "Formuler une vision artistique concise et différenciante.", output: "Vision artistique", dependsOn: [0, 1] },
      { role: "producer", objective: "Structurer les éléments de faisabilité à présenter sans alourdir le pitch.", output: "Faisabilité", dependsOn: [0] },
      { role: "validator", objective: "Contrôler clarté, cohérence et absence de contradictions.", output: "Validation pitch", dependsOn: [1, 2, 3] },
      { role: "producer", objective: "Assembler la structure finale du pitch deck.", output: "Pitch deck", dependsOn: [4] },
    ],
  },
};

export function getPackageWorkflow(id: FundingPackageId) {
  return PACKAGE_WORKFLOWS[id];
}

export function detectWorkflow(message: string): AgentWorkflow | null {
  return WORKFLOWS.find((workflow) => workflow.test.test(message)) ?? null;
}

export function workflowInstruction(workflow: AgentWorkflow) {
  return `MODE ORCHESTRATEUR : La demande correspond au workflow « ${workflow.title} ». ${workflow.summary}\n\nNe tente pas d'exécuter tout le workflow en une seule modification. Produis une réponse structurée et propose uniquement les actions directement justifiées par la demande. Les tâches prévues sont :\n${workflow.tasks.map((task, index) => `${index + 1}. ${task.role} — ${task.objective} → ${task.output}`).join("\n")}`;
}
