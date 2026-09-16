import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../../../lib/supabase-server";
import { validateFundingPackage } from "../../../../../../../../../lib/ai/package-validator";
import { getFundingPackage } from "../../../../../../../../../lib/ai/funding-packages";
import { buildPackageDocx } from "../../../../../../../../../lib/dossier/docx";

type Params = { params: Promise<{ id: string; packageId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: projectId, packageId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const pack = getFundingPackage(packageId);
  if (!pack) return NextResponse.json({ error: "Package de financement inconnu." }, { status: 400 });

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("title,genre,duration_minutes,country,language,theme,target_audience,logline")
    .eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents, error: documentsError } = await supabase
    .from("documents").select("type,title,content,status").eq("project_id", projectId);
  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 400 });

  const validation = validateFundingPackage(documents ?? [], packageId);
  if (!validation.ready) {
    return NextResponse.json({ error: "Le package doit passer tous les contrôles bloquants avant l’export final.", validation }, { status: 409 });
  }

  const docx = await buildPackageDocx(pack, project, documents ?? []);
  return new NextResponse(docx, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="filmfund-${projectId}-${packageId}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
