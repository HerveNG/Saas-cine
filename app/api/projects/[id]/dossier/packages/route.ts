import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../../lib/supabase-server";
import { FUNDING_PACKAGES, getFundingPackage } from "../../../../../../../../lib/ai/funding-packages";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id,title").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents, error } = await supabase.from("documents").select("type,title,content,status,current_version,updated_at").eq("project_id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const existing = new Set((documents ?? []).filter((doc) => doc.content?.trim()).map((doc) => doc.type));
  const packages = FUNDING_PACKAGES.map((item) => {
    const required = item.requiredDocuments.map((type) => ({ type, present: existing.has(type) }));
    const optional = item.optionalDocuments.map((type) => ({ type, present: existing.has(type) }));
    const missing = required.filter((item) => !item.present).map((item) => item.type);
    return {
      ...item,
      ready: missing.length === 0,
      completion: Math.round(((required.length - missing.length) / required.length) * 100),
      required,
      optional,
      missing,
    };
  });

  return NextResponse.json({ project, packages });
}

export async function POST(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const body = await request.json().catch(() => ({}));
  const packageId = typeof body.packageId === "string" ? body.packageId : "";
  const selected = getFundingPackage(packageId);
  if (!selected) return NextResponse.json({ error: "Package de financement inconnu." }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: project } = await supabase.from("projects").select("id,title,genre,logline").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: documents } = await supabase.from("documents").select("type,title,content").eq("project_id", projectId);
  const existing = new Set((documents ?? []).filter((doc) => doc.content?.trim()).map((doc) => doc.type));
  const missing = selected.requiredDocuments.filter((type) => !existing.has(type));

  return NextResponse.json({
    package: selected,
    project,
    missing,
    ready: missing.length === 0,
    nextStep: missing.length ? `Générer ou compléter : ${missing.join(", ")}` : "Package complet : lancer la validation finale.",
  });
}
