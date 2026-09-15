import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";

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

  const { error } = await supabase.from("projects").update(update).eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
