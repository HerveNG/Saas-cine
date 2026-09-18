import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";
import { validateDossier } from "../../../../../../lib/ai/dossier-validator";
import { getFundingPackage } from "../../../../../../lib/ai/funding-packages";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const project = await supabase.from("projects").select("id,title").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (project.error) return NextResponse.json({ error: project.error.message }, { status: 400 });
  if (!project.data) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const url = new URL(request.url);
  const packageId = url.searchParams.get("package") || "funding_dossier";
  const selected = getFundingPackage(packageId);
  if (!selected) return NextResponse.json({ error: "Package de financement inconnu." }, { status: 400 });

  const { data: documents, error } = await supabase.from("documents").select("type,title,content,status").eq("project_id", projectId).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    project: project.data,
    package: selected,
    validation: validateDossier(documents ?? [], selected.requiredDocuments),
  });
}
