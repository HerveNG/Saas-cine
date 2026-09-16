import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase-server";
import { validateDossier } from "../../../../../../../lib/ai/dossier-validator";
import { getFundingPackage } from "../../../../../../../lib/ai/funding-packages";
import { buildDossierPdf } from "../../../../../../../lib/dossier/export";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project, error: projectError } = await supabase.from("projects").select("title,genre,duration_minutes,country,language,theme,target_audience,logline").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents, error: documentsError } = await supabase.from("documents").select("type,title,content,status").eq("project_id", projectId);
  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 400 });

  const url = new URL(request.url);
  const packageId = url.searchParams.get("package") || "funding_dossier";
  const selectedPackage = getFundingPackage(packageId);
  if (!selectedPackage) return NextResponse.json({ error: "Package de financement inconnu." }, { status: 400 });

  const validation = validateDossier(documents ?? [], selectedPackage.requiredDocuments);
  if (!validation.ready) {
    return NextResponse.json({ error: "Le dossier doit passer tous les contrôles bloquants avant l’export final.", package: selectedPackage, validation }, { status: 409 });
  }

  const pdf = buildDossierPdf(project, documents ?? []);
  const safePackage = selectedPackage.id.replace(/[^a-z0-9_-]/gi, "-");
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="filmfund-${projectId}-${safePackage}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
