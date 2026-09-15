import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";

async function clientForProject(id: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, allowed: false };
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  return { supabase, user, allowed: !!project };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, allowed } = await clientForProject(id);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const { data, error } = await supabase.from("characters").select("id,name,role,age,biography,personality,psychology,habits,relationships,evolution,created_at,updated_at").eq("project_id", id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, allowed } = await clientForProject(id);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Le nom du personnage est obligatoire." }, { status: 400 });
  const age = body.age === "" || body.age == null ? null : Number(body.age);
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) return NextResponse.json({ error: "L’âge doit être un entier valide." }, { status: 400 });
  const { data, error } = await supabase.from("characters").insert({ project_id: id, name, role: body.role || null, age, biography: body.biography || null, personality: body.personality || null, psychology: body.psychology || null, habits: body.habits || null, relationships: body.relationships || null, evolution: body.evolution || null }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, allowed } = await clientForProject(id);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const body = await request.json();
  if (!body.character_id) return NextResponse.json({ error: "character_id est obligatoire." }, { status: 400 });
  const fields = ["name", "role", "age", "biography", "personality", "psychology", "habits", "relationships", "evolution"];
  const update: Record<string, unknown> = {};
  for (const field of fields) if (field in body) update[field] = body[field] || null;
  if ("name" in update && !String(update.name ?? "").trim()) return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  if ("age" in update && update.age !== null) update.age = Number(update.age);
  const { error } = await supabase.from("characters").update(update).eq("id", body.character_id).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, allowed } = await clientForProject(id);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const { character_id } = await request.json();
  if (!character_id) return NextResponse.json({ error: "character_id est obligatoire." }, { status: 400 });
  const { error } = await supabase.from("characters").delete().eq("id", character_id).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
