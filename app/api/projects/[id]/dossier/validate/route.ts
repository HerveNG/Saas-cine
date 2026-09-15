import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";
import { validateFundingDossier } from "../../../../../../lib/ai/dossier-validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents, error } = await supabase
    .from("documents")
    .select("type,title,content,status")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(validateFundingDossier(documents ?? []));
}
