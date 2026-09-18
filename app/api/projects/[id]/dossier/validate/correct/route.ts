import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase-server";
import { contextToText, getProjectContext } from "../../../../../../../lib/ai/project-context";
import { generateObservedAIResponse } from "../../../../../../../lib/ai/observability";
import { parseAIActionResponse } from "../../../../../../../lib/ai/action-parser";
import { validateAction } from "../../../../../../../lib/ai/actions";
import { getFundingPackage } from "../../../../../../../lib/ai/funding-packages";

type Params = { params: Promise<{ id: string }> };

const ROLE_BY_TYPE: Record<string, string> = {
  synopsis: "development", intent_note: "development", director_note: "director",
  production_schedule: "producer", budget: "financing", financing_plan: "financing",
  pitch_deck: "financing", bible: "screenwriter", scenario: "screenwriter",
  technical_breakdown: "producer",
};

const LABEL_BY_TYPE: Record<string, string> = {
  synopsis: "Synopsis", intent_note: "Note d’intention", director_note: "Note de réalisation",
  production_schedule: "Planning de production", budget: "Budget", financing_plan: "Plan de financement",
  pitch_deck: "Pitch deck", bible: "Bible", scenario: "Scénario", technical_breakdown: "Dépouillement technique",
};

export async function POST(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id,title").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const checkCode = typeof body?.checkCode === "string" ? body.checkCode : "";
  const packageId = typeof body?.packageId === "string" ? body.packageId : "funding_dossier";
  const userInstruction = typeof body?.instruction === "string" ? body.instruction.trim().slice(0, 3000) : "";

  const pkg = getFundingPackage(packageId);
  if (!pkg) return NextResponse.json({ error: "Package de financement inconnu." }, { status: 400 });

  const match = /^(?:missing|empty|placeholder)_(.+)$/.exec(checkCode);
  if (!match) return NextResponse.json({ error: "Cette vérification ne correspond pas à une correction documentaire ciblée." }, { status: 400 });

  const documentType = match[1];
  if (!pkg.requiredDocuments.includes(documentType)) return NextResponse.json({ error: "Ce document ne fait pas partie des exigences du package sélectionné." }, { status: 400 });

  const { data: document } = await supabase.from("documents").select("id,type,title,content,status,current_version")
    .eq("project_id", projectId).eq("type", documentType).order("updated_at", { ascending: false }).limit(1).maybeSingle();

  const context = await getProjectContext(supabase, projectId);
  if (!context) return NextResponse.json({ error: "Contexte du projet introuvable." }, { status: 404 });

  const role = ROLE_BY_TYPE[documentType] || "development";
  const label = LABEL_BY_TYPE[documentType] || documentType;
  const operation = document ? "update_document" : "create_document";

  const system = `Tu es un agent de correction ciblée d'un dossier audiovisuel professionnel.
Tu dois corriger UNIQUEMENT la pièce demandée, sans réécrire inutilement les autres documents.
Utilise le contexte du projet comme source de vérité. N'invente aucun fait, chiffre, partenaire, résultat ou information biographique.
Si une information indispensable manque, formule une proposition prudente et signale l'information à confirmer dans le contenu.
La sortie doit contenir exactement UNE action JSON compatible avec le système:
- création: {"type":"create_document","payload":{"type":"...","title":"...","content":"..."}}
- mise à jour: {"type":"update_document","payload":{"documentId":"...","content":"..."}}
Le contenu produit doit être directement exploitable dans un dossier professionnel, sans commentaires du type "voici une version améliorée".
Réponds avec le format habituel ACTION + réponse courte, sans action supplémentaire.

TYPE DE DOCUMENT: ${documentType}
DOCUMENT: ${label}
PROBLÈME: ${checkCode}
PACKAGE: ${pkg.label}
OBJECTIF DU PACKAGE: ${pkg.workflowGoal}
DOCUMENT EXISTANT:
${document ? document.content || "(vide)" : "(absent)"}
INSTRUCTION UTILISATEUR:
${userInstruction || "(aucune)"}

CONTEXTE DU PROJET:
${contextToText(context)}`;

  try {
    const response = await generateObservedAIResponse(
      [{ role: "system", content: system }, { role: "user", content: `Corrige maintenant la pièce « ${label} » pour résoudre le contrôle ${checkCode}.` }],
      { supabase, workflowId: null, taskId: null, projectId, userId: user.id, role },
    );

    const parsed = parseAIActionResponse(response.content);
    const action = parsed.actions.map(validateAction).find((candidate) =>
      candidate?.type === operation &&
      ((candidate.type === "create_document" && candidate.payload.type === documentType) ||
        (candidate.type === "update_document" && candidate.payload.documentId === document?.id))
    );

    if (!action) return NextResponse.json({ error: "L'agent n'a pas produit une correction documentaire exploitable.", rawAnswer: parsed.answer || response.content }, { status: 502 });

    const { data: saved, error } = await supabase.from("ai_actions").insert({
      project_id: projectId, conversation_id: null, user_id: user.id,
      action_type: action.type, payload: action.payload, status: "proposed",
    }).select("id,action_type,payload,status,created_at").single();

    if (error || !saved) return NextResponse.json({ error: error?.message || "Impossible d'enregistrer la correction." }, { status: 400 });

    return NextResponse.json({ action: saved, answer: parsed.answer || `Correction proposée pour « ${label} ».`, documentType, role, package: pkg.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur du service IA.";
    const code = (error as { code?: string })?.code;
    return NextResponse.json({ error: message, code }, { status: code === "AI_QUOTA_EXCEEDED" ? 429 : 502 });
  }
}
