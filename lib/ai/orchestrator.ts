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
    test: /(financement|financer|fonds|funding|dossier de financement)/i,
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
