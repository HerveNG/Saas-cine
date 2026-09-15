import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase-server";
import { isAIRole } from "../../../../../../../lib/ai/roles";
import { validateAction } from "../../../../../../../lib/ai/actions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: actions, error } = await supabase.from("ai_actions").select("id,conversation_id,action_type,payload,status,result,error_message,created_at,executed_at").eq("project_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(actions ?? []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = validateAction(body?.action);
  if (!action) return NextResponse.json({ error: "Action IA invalide." }, { status: 400 });
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  if (conversationId) {
    const { data: conversation } = await supabase.from("ai_conversations").select("id,role").eq("id", conversationId).eq("project_id", id).eq("user_id", user.id).maybeSingle();
    if (!conversation || (body?.role && (!isAIRole(body.role) || conversation.role !== body.role))) return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
  }

  const { data, error } = await supabase.from("ai_actions").insert({ project_id: id, conversation_id: conversationId, user_id: user.id, action_type: action.type, payload: action.payload, status: "proposed" }).select("id,action_type,payload,status,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
