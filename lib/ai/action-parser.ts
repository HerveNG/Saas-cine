import { validateAction, type AIAction } from "./actions";

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || text.trim();
  try { return JSON.parse(candidate); } catch {}
  const objectStart = candidate.indexOf("{");
  const objectEnd = candidate.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    try { return JSON.parse(candidate.slice(objectStart, objectEnd + 1)); } catch {}
  }
  return null;
}

export function parseAIActionResponse(text: string): { answer: string; actions: AIAction[] } {
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { answer: text, actions: [] };
  const candidate = parsed as Record<string, unknown>;
  const answer = typeof candidate.answer === "string" ? candidate.answer.trim() : "";
  const rawActions = Array.isArray(candidate.actions) ? candidate.actions : [];
  const actions = rawActions.map(validateAction).filter((action): action is AIAction => Boolean(action));
  return { answer: answer || text, actions };
}

export function actionInstruction() {
  return `\n\nMODE AGENT : Si la demande nécessite de créer ou modifier des données du projet, réponds UNIQUEMENT avec un objet JSON valide : {"answer":"explication courte","actions":[{"type":"create_document|update_document|update_project|create_character|update_character","payload":{}}]}. Ne propose une action que si elle est explicitement justifiée par la demande. Toute modification doit être proposée, jamais considérée comme déjà appliquée. Pour une simple question sans modification, utilise actions: []. N'invente jamais les identifiants de documents ou personnages : utilise uniquement ceux présents dans le contexte du projet.`;
}
