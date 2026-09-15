import type { AIRole } from "./roles";

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
      {
        role: "development",
        objective: "Auditer le projet, identifier ses forces, lacunes, incohérences et informations manquantes. Préparer la structure éditoriale du dossier.",
        output: "Diagnostic et architecture du dossier",
      },
      {
        role: "screenwriter",
        objective: "Produire les éléments narratifs destinés au dossier : logline, synopsis court, synopsis détaillé et présentation des personnages lorsque les données disponibles le permettent. Proposer la création ou mise à jour des documents narratifs correspondants.",
        output: "Pack narratif du dossier",
        dependsOn: [0],
      },
      {
        role: "director",
        objective: "Rédiger la note de réalisation et formaliser la vision artistique : intention, traitement, mise en scène, image, son et parti pris esthétique, sans inventer de faits absents du projet.",
        output: "Note de réalisation",
        dependsOn: [0, 1],
      },
      {
        role: "producer",
        objective: "Structurer le cadre de production : format, besoins principaux, étapes, ressources, hypothèses budgétaires, risques et éléments à confirmer. Proposer les documents de production pertinents.",
        output: "Cadre de production",
        dependsOn: [0],
      },
      {
        role: "financing",
        objective: "Construire le plan de financement à partir des éléments narratifs, artistiques et de production validés. Distinguer clairement les données connues, hypothèses et montants à confirmer.",
        output: "Plan de financement",
        dependsOn: [1, 2, 3],
      },
      {
        role: "producer",
        objective: "Assembler un budget prévisionnel cohérent avec le format et le cadre de production. Signaler les hypothèses financières et proposer la création ou mise à jour du document budget.",
        output: "Budget prévisionnel",
        dependsOn: [3, 4],
      },
      {
        role: "financing",
        objective: "Effectuer le contrôle de cohérence final du dossier : adéquation projet/budget/financement, pièces manquantes, risques et informations à vérifier avant soumission. Proposer les corrections nécessaires sans les appliquer silencieusement.",
        output: "Contrôle de cohérence financement",
        dependsOn: [4, 5],
      },
      {
        role: "producer",
        objective: "Préparer la checklist finale de soumission et la structure du pitch deck : documents requis, ordre de présentation, points à défendre et éléments encore à compléter.",
        output: "Checklist et structure du pitch",
        dependsOn: [6],
      },
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

export function detectWorkflow(message: string): AgentWorkflow | null {
  return WORKFLOWS.find((workflow) => workflow.test.test(message)) ?? null;
}

export function workflowInstruction(workflow: AgentWorkflow) {
  return `MODE ORCHESTRATEUR : La demande correspond au workflow « ${workflow.title} ». ${workflow.summary}\n\nNe tente pas d'exécuter tout le workflow en une seule modification. Produis une réponse structurée et propose uniquement les actions directement justifiées par la demande. Les tâches prévues sont :\n${workflow.tasks.map((task, index) => `${index + 1}. ${task.role} — ${task.objective} → ${task.output}`).join("\n")}`;
}
