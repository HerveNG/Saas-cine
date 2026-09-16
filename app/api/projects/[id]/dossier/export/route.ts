import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase-server";
import { validateFundingDossier } from "../../../../../../../lib/ai/dossier-validator";
import { buildDossierPdf } from "../../../../../../../lib/dossier/export";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: project, error: projectError } = await supabase.from("projects").select("title,genre,duration_minutes,country,language,theme,target_audience,logline").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const { data: documents, error: documentsError } = await supabase.from("documents").select("type,title,content,status").eq("project_id", projectId);
  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 400 });
  const validation = validateFundingDossier(documents ?? []);
  if (!validation.ready) return NextResponse.json({ error: "Le dossier doit passer tous les contrôles bloquants avant l’export final.", validation }, { status: 409 });
  const pdf = buildDossierPdf(project, documents ?? []);
  return new NextResponse(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="filmfund-${projectId}-dossier.pdf"`, "Cache-Control": "no-store" } });
}
