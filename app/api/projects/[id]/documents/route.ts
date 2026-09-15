import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";

const TYPES = ["synopsis", "intent_note", "director_note", "bible", "pitch_deck", "scenario", "technical_breakdown", "budget", "financing_plan", "production_schedule"] as const;

async function getProject(request: Request, id: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  const { data: project, error } = await supabase.from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error) return { supabase, user, error: NextResponse.json({ error: error.message }, { status: 400 }) };
  if (!project) return { supabase, user, error: NextResponse.json({ error: "Projet introuvable." }, { status: 404 }) };
  return { supabase, user, error: null };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getProject(request, id);
  if (auth.error) return auth.error;
  const { data, error } = await auth.supabase.from("documents").select("id,type,title,content,status,current_version,updated_at").eq("project_id", id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getProject(request, id);
  if (auth.error) return auth.error;
  const body = await request.json();
  const type = String(body.type ?? "");
  const title = String(body.title ?? "").trim();
  const content = typeof body.content === "string" ? body.content : "";
  if (!TYPES.includes(type as (typeof TYPES)[number])) return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });
  const { data, error } = await auth.supabase.from("documents").insert({ project_id: id, type, title, content }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (content) await auth.supabase.from("document_versions").insert({ document_id: data.id, version_number: 1, content, created_by: auth.user!.id });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
