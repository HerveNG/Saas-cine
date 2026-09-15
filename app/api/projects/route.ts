import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const genre = typeof body.genre === "string" ? body.genre.trim() : null;
  const country = typeof body.country === "string" ? body.country.trim() : null;
  const language = typeof body.language === "string" ? body.language.trim() : null;
  const theme = typeof body.theme === "string" ? body.theme.trim() : null;
  const duration = body.duration === "" || body.duration == null ? null : Number(body.duration);

  if (!title || !["Documentaire", "Fiction", "Série"].includes(type)) {
    return NextResponse.json({ error: "Titre et type de projet requis." }, { status: 400 });
  }

  if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
    return NextResponse.json({ error: "La durée doit être un entier positif." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      type,
      genre,
      duration_minutes: duration,
      country,
      language,
      theme,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: detailsError } = await supabase
    .from("project_details")
    .insert({ project_id: data.id, concept: theme });

  if (detailsError) {
    await supabase.from("projects").delete().eq("id", data.id);
    return NextResponse.json({ error: detailsError.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}
