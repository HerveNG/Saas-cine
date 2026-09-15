import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data, error } = await supabase.from("projects").select("title,genre,duration_minutes,country,language,theme,target_audience,logline,status,progress").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  return NextResponse.json({ ...data, duration_minutes: data.duration_minutes?.toString() ?? "", progress: data.progress?.toString() ?? "0" });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await request.json();
  const allowed = ["title", "genre", "duration_minutes", "country", "language", "theme", "target_audience", "logline", "status", "progress"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) update[key] = body[key];
  if (!Object.keys(update).length) return NextResponse.json({ error: "Aucune donnée à modifier." }, { status: 400 });
  if ("progress" in update && (!Number.isInteger(update.progress) || Number(update.progress) < 0 || Number(update.progress) > 100)) return NextResponse.json({ error: "La progression doit être comprise entre 0 et 100." }, { status: 400 });
  if ("duration_minutes" in update && update.duration_minutes !== null && (!Number.isInteger(update.duration_minutes) || Number(update.duration_minutes) <= 0)) return NextResponse.json({ error: "La durée doit être un entier positif." }, { status: 400 });
  const { error } = await supabase.from("projects").update(update).eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
