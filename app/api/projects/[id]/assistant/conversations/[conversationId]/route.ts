import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const { id, conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: conversation, error: conversationError } = await supabase.from("ai_conversations").select("id,role,title,created_at,updated_at").eq("id", conversationId).eq("project_id", id).eq("user_id", user.id).maybeSingle();
  if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 400 });
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  const { data: messages, error } = await supabase.from("ai_messages").select("id,role,content,created_at").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversation, messages: messages ?? [] });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; conversationId: string }> }) {
  const { id, conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { error } = await supabase.from("ai_conversations").delete().eq("id", conversationId).eq("project_id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
