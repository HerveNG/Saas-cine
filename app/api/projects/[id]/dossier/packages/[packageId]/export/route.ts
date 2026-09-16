import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase-server";
import { getFundingPackage } from "../../../../../../../lib/ai/funding-packages";
import { validateFundingPackage } from "../../../../../../../lib/ai/package-validator";
import { buildPackagePdf } from "../../../../../../../lib/dossier/export";

type Params = { params: Promise<{ id: string; packageId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: projectId, packageId } = await params;
  const pack = getFundingPackage(packageId);
  if (!pack) return NextResponse.json({ error: "Package inconnu." }, { status: 404 });

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("title,genre,duration_minutes,country,language,theme,target_audience,logline").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents, error } = await supabase.from("documents").select("type,title,content,status").eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const validation = validateFundingPackage(documents ?? [], packageId);
  if (!validation.ready) return NextResponse.json({ error: "Le package doit passer tous les contrôles avant export.", validation }, { status: 409 });

  const pdf = buildPackagePdf(pack, project, documents ?? []);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="filmfund-${projectId}-${packageId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
