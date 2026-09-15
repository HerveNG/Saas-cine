import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";
import { detectWorkflow } from "../../../../../lib/ai/orchestrator";
import type { AIRole } from "../../../../../lib/ai/roles";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: workflows, error } = await supabase.from("ai_workflows").select("id,title,goal,status,current_task_index,created_at,updated_at,completed_at,ai_tasks(id,task_index,role,objective,output_label,status,output,action_ids,error_message,started_at,completed_at)").eq("project_id", projectId).eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(workflows ?? []);
}

export async function POST(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { data: project } = await supabase.from("projects").select("id,title").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  const workflow = detectWorkflow(goal);
  if (!workflow) return NextResponse.json({ error: "Aucun workflow pris en charge n'a été détecté." }, { status: 400 });
  const { data: existing } = await supabase.from("ai_workflows").select("id").eq("project_id", projectId).eq("user_id", user.id).in("status", ["running", "waiting_approval"]).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ error: "Un workflow est déjà en cours pour ce projet.", workflowId: existing.id }, { status: 409 });

  const { data: created, error: workflowError } = await supabase.from("ai_workflows").insert({ project_id: projectId, user_id: user.id, title: workflow.title, goal: goal || workflow.title }).select("id,title,goal,status,current_task_index,created_at,updated_at").single();
  if (workflowError || !created) return NextResponse.json({ error: workflowError?.message || "Création impossible." }, { status: 500 });

  const tasks = workflow.tasks.map((task, index) => ({ workflow_id: created.id, project_id: projectId, user_id: user.id, task_index: index, role: task.role as AIRole, objective: task.objective, output_label: task.output, depends_on: task.dependsOn ?? [] }));
  const { data: createdTasks, error: tasksError } = await supabase.from("ai_tasks").insert(tasks).select("id,task_index,role,objective,output_label,depends_on,status").order("task_index");
  if (tasksError) {
    await supabase.from("ai_workflows").delete().eq("id", created.id).eq("user_id", user.id);
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }
  return NextResponse.json({ workflow: created, tasks: createdTasks ?? [] }, { status: 201 });
}
