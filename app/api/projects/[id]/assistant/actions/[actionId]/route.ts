import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../../lib/supabase-server";
import { validateAction } from "../../../../../../../../lib/ai/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; actionId: string }> }) {
  const { id, actionId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "approve" && decision !== "reject") return NextResponse.json({ error: "Décision invalide." }, { status: 400 });

  const { data: action } = await supabase.from("ai_actions").select("id,project_id,action_type,payload,status").eq("id", actionId).eq("project_id", id).eq("user_id", user.id).maybeSingle();
  if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  if (action.status !== "proposed") return NextResponse.json({ error: "Cette action a déjà été traitée." }, { status: 409 });

  if (decision === "reject") {
    const { data, error } = await supabase.from("ai_actions").update({ status: "rejected", executed_at: new Date().toISOString() }).eq("id", actionId).eq("status", "proposed").select("id,status").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  const validated = validateAction({ type: action.action_type, payload: action.payload });
  if (!validated) return NextResponse.json({ error: "Action refusée : payload invalide." }, { status: 400 });

  try {
    let result: Record<string, unknown> = {};
    switch (validated.type) {
      case "create_document": {
        const { type, title, content } = validated.payload as { type: string; title: string; content: string };
        const { data: document, error } = await supabase.from("documents").insert({ project_id: id, type, title, content, status: "draft", current_version: 1 }).select("id,title,type,current_version").single();
        if (error) throw new Error(error.message);
        if (content) {
          const { error: versionError } = await supabase.from("document_versions").insert({ document_id: document.id, version_number: 1, content, created_by: user.id });
          if (versionError) throw new Error(versionError.message);
        }
        result = { document };
        break;
      }
      case "update_document": {
        const { documentId, title, content } = validated.payload as { documentId: string; title?: string; content?: string };
        const { data: document } = await supabase.from("documents").select("id,title,content,current_version").eq("id", documentId).eq("project_id", id).maybeSingle();
        if (!document) throw new Error("Document introuvable.");
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) { updates.content = content; updates.current_version = document.current_version + 1; }
        const { error } = await supabase.from("documents").update(updates).eq("id", documentId).eq("project_id", id);
        if (error) throw new Error(error.message);
        if (content !== undefined) {
          const { error: versionError } = await supabase.from("document_versions").insert({ document_id: documentId, version_number: document.current_version + 1, content, created_by: user.id });
          if (versionError) throw new Error(versionError.message);
        }
        result = { documentId };
        break;
      }
      case "update_project": {
        const { fields } = validated.payload as { fields: Record<string, unknown> };
        if (fields.duration_minutes !== undefined && fields.duration_minutes !== null && (!Number.isInteger(fields.duration_minutes) || Number(fields.duration_minutes) <= 0)) throw new Error("Durée invalide.");
        if (fields.progress !== undefined && (!Number.isInteger(fields.progress) || Number(fields.progress) < 0 || Number(fields.progress) > 100)) throw new Error("Progression invalide.");
        const { error } = await supabase.from("projects").update(fields).eq("id", id).eq("owner_id", user.id);
        if (error) throw new Error(error.message);
        result = { projectId: id, fields };
        break;
      }
      case "create_character": {
        const { fields } = validated.payload as { fields: Record<string, unknown> };
        const { data: character, error } = await supabase.from("characters").insert({ project_id: id, ...fields }).select("id,name,role,age").single();
        if (error) throw new Error(error.message);
        result = { character };
        break;
      }
      case "update_character": {
        const { characterId, fields } = validated.payload as { characterId: string; fields: Record<string, unknown> };
        const { error } = await supabase.from("characters").update(fields).eq("id", characterId).eq("project_id", id);
        if (error) throw new Error(error.message);
        result = { characterId, fields };
        break;
      }
    }

    const { data, error } = await supabase.from("ai_actions").update({ status: "executed", result, executed_at: new Date().toISOString(), error_message: null }).eq("id", actionId).eq("status", "proposed").select("id,status,result,executed_at").single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'exécution.";
    await supabase.from("ai_actions").update({ status: "failed", error_message: errorMessage, executed_at: new Date().toISOString() }).eq("id", actionId).eq("status", "proposed");
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
