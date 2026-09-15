import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_TEXT = 6000;
const clip = (value: string | null | undefined) => (value ?? "").slice(0, MAX_TEXT);

export async function getProjectContext(supabase: SupabaseClient, projectId: string) {
  const [{ data: project }, { data: details }, { data: characters }, { data: documents }] = await Promise.all([
    supabase.from("projects").select("id,title,type,genre,duration_minutes,country,language,theme,target_audience,logline,status,progress").eq("id", projectId).maybeSingle(),
    supabase.from("project_details").select("concept,story,creative_vision,production_context,additional_notes").eq("project_id", projectId).maybeSingle(),
    supabase.from("characters").select("name,role,age,biography,personality,psychology,habits,relationships,evolution").eq("project_id", projectId).order("created_at", { ascending: true }).limit(30),
    supabase.from("documents").select("type,title,content,status,current_version,updated_at").eq("project_id", projectId).order("updated_at", { ascending: false }).limit(20),
  ]);

  if (!project) return null;
  return { project, details, characters: characters ?? [], documents: (documents ?? []).map((document) => ({ ...document, content: clip(document.content) })) };
}

export function contextToText(context: NonNullable<Awaited<ReturnType<typeof getProjectContext>>>) {
  return JSON.stringify(context, null, 2);
}
