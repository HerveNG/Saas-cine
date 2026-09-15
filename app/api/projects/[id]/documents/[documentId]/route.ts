import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";

async function getDocument(id: string, documentId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, document: null, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  const { data: document, error } = await supabase.from("documents").select("id,project_id,title,type,content,status,current_version").eq("id", documentId).eq("project_id", id).maybeSingle();
  if (error) return { supabase, user, document: null, response: NextResponse.json({ error: error.message }, { status: 400 }) };
  if (!document) return { supabase, user, document: null, response: NextResponse.json({ error: "Document introuvable." }, { status: 404 }) };
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!project) return { supabase, user, document: null, response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) };
  return { supabase, user, document, response: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const auth = await getDocument(id, documentId);
  if (auth.response) return auth.response;
  return NextResponse.json(auth.document);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const auth = await getDocument(id, documentId);
  if (auth.response) return auth.response;
  const body = await request.json();
  const update: Record<string, unknown> = {};
  if ("title" in body) update.title = String(body.title ?? "").trim();
  if ("status" in body) update.status = String(body.status ?? "draft");
  const contentChanged = typeof body.content === "string" && body.content !== auth.document!.content;
  if (contentChanged) update.content = body.content;
  if (!Object.keys(update).length) return NextResponse.json({ error: "Aucune donnée à modifier." }, { status: 400 });
  if ("title" in update && !update.title) return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });

  let nextVersion = auth.document!.current_version;
  if (contentChanged) {
    nextVersion += 1;
    update.current_version = nextVersion;
  }
  const { error } = await auth.supabase.from("documents").update(update).eq("id", documentId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (contentChanged) {
    const { error: versionError } = await auth.supabase.from("document_versions").insert({ document_id: documentId, version_number: nextVersion, content: body.content, created_by: auth.user!.id });
    if (versionError) return NextResponse.json({ error: versionError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, version: nextVersion });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  const auth = await getDocument(id, documentId);
  if (auth.response) return auth.response;
  const { error } = await auth.supabase.from("documents").delete().eq("id", documentId).eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
