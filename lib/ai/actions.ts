import type { AIRole } from "./roles";

export const AI_ACTION_TYPES = [
  "create_document",
  "update_document",
  "update_project",
  "create_character",
  "update_character",
] as const;

export type AIActionType = (typeof AI_ACTION_TYPES)[number];

export type AIAction = {
  type: AIActionType;
  payload: Record<string, unknown>;
};

export type ProposedAIAction = AIAction & {
  id?: string;
  role: AIRole;
  status?: "proposed" | "approved" | "rejected" | "executed" | "failed";
};

export const DOCUMENT_TYPES = [
  "synopsis",
  "intent_note",
  "director_note",
  "bible",
  "pitch_deck",
  "scenario",
  "technical_breakdown",
  "budget",
  "financing_plan",
  "production_schedule",
] as const;

export function isActionType(value: unknown): value is AIActionType {
  return typeof value === "string" && (AI_ACTION_TYPES as readonly string[]).includes(value);
}

export function isDocumentType(value: unknown): value is (typeof DOCUMENT_TYPES)[number] {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

const PROJECT_FIELDS = [
  "title",
  "genre",
  "duration_minutes",
  "country",
  "language",
  "theme",
  "target_audience",
  "logline",
  "status",
  "progress",
] as const;

const CHARACTER_FIELDS = [
  "name",
  "role",
  "age",
  "biography",
  "personality",
  "psychology",
  "habits",
  "relationships",
  "evolution",
] as const;

function pickAllowedFields(input: unknown, allowed: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => allowed.includes(key) && value !== undefined));
}

export function validateAction(action: unknown): AIAction | null {
  if (!action || typeof action !== "object" || Array.isArray(action)) return null;
  const candidate = action as Record<string, unknown>;
  if (!isActionType(candidate.type)) return null;
  const payload = candidate.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;

  switch (candidate.type) {
    case "create_document":
      if (!isDocumentType(p.type) || typeof p.title !== "string" || typeof p.content !== "string") return null;
      return { type: candidate.type, payload: { type: p.type, title: p.title.slice(0, 200), content: p.content.slice(0, 50000) } };
    case "update_document":
      if (typeof p.documentId !== "string") return null;
      if (p.title !== undefined && typeof p.title !== "string") return null;
      if (p.content !== undefined && typeof p.content !== "string") return null;
      if (p.title === undefined && p.content === undefined) return null;
      return { type: candidate.type, payload: { documentId: p.documentId, ...(p.title !== undefined ? { title: p.title.slice(0, 200) } : {}), ...(p.content !== undefined ? { content: p.content.slice(0, 50000) } : {}) } };
    case "update_project": {
      const fields = pickAllowedFields(p.fields, PROJECT_FIELDS);
      if (!Object.keys(fields).length) return null;
      return { type: candidate.type, payload: { fields } };
    }
    case "create_character": {
      const fields = pickAllowedFields(p.fields, CHARACTER_FIELDS);
      if (typeof fields.name !== "string" || !fields.name.trim()) return null;
      return { type: candidate.type, payload: { fields } };
    }
    case "update_character": {
      if (typeof p.characterId !== "string") return null;
      const fields = pickAllowedFields(p.fields, CHARACTER_FIELDS);
      if (!Object.keys(fields).length) return null;
      return { type: candidate.type, payload: { characterId: p.characterId, fields } };
    }
  }
}
