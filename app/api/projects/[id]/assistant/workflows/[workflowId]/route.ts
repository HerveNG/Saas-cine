import { NextResponse } from "next/server";
import { createClient } from "../../../../../../../lib/supabase/server";
import { getProjectContext, contextToText } from "../../../../../../../lib/ai/project-context";
import { AI_ROLES, type AIRole } from "../../../../../../../lib/ai/roles";
import { generateAIResponse } from "../../../../../../../lib/ai/provider";
import { actionInstruction, parseAIActionResponse } from "../../../../../../../lib/ai/action-parser";
import { validateAction, type AIAction } from "../../../../../../../lib/ai/actions";

type Params = { params: Promise<{ id: string; workflowId: string }> };

async function loadWorkflow(supabase: any, projectId: string, workflowId: string, userId: string) {
  const { data: workflow, error } = await supabase.from("ai_workflows").select("*").eq("id", workflowId).eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!workflow) throw new Error("Workflow introuvable.");
  const { data: tasks, error: taskError } = await supabase.from("ai_tasks").select("*").eq("workflow_id", workflowId).eq("user_id", userId).order("task_index");
  if (taskError) throw new Error(taskError.message);
  return { workflow, tasks: tasks ?? [] };
}

export async function GET(request: Request, { params }: Params) {
  const { id: projectId, workflowId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur." }, { status: 404 }); }
}

export async function POST(request: Request, { params }: Params) {
  const { id: projectId, workflowId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const operation = body.operation === "run" ? "run" : body.operation === "cancel" ? "cancel" : "run";
  try {
    const loaded = await loadWorkflow(supabase, projectId, workflowId, user.id);
    if (operation === "cancel") {
      if (["completed", "cancelled"].includes(loaded.workflow.status)) return NextResponse.json(loaded);
      await supabase.from("ai_workflows").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
      return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
    }
    if (["completed", "cancelled", "failed"].includes(loaded.workflow.status)) return NextResponse.json(loaded);

    const task = loaded.tasks.find((item: any) => item.status === "waiting_approval") || loaded.tasks.find((item: any) => item.status === "pending");
    if (!task) {
      await supabase.from("ai_workflows").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
      return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
    }
    if (task.status === "waiting_approval") return NextResponse.json({ ...loaded, message: "Cette tâche attend la validation des actions proposées." }, { status: 409 });

    const dependencies = Array.isArray(task.depends_on) ? task.depends_on : [];
    const dependencyTasks = loaded.tasks.filter((candidate: any) => dependencies.includes(candidate.task_index));
    if (dependencyTasks.some((candidate: any) => candidate.status !== "completed")) {
      return NextResponse.json({ error: "Les tâches précédentes doivent être terminées avant celle-ci." }, { status: 409 });
    }

    await supabase.from("ai_tasks").update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString(), error_message: null }).eq("id", task.id).eq("user_id", user.id);
    await supabase.from("ai_workflows").update({ status: "running", current_task_index: task.task_index, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);

    const context = await getProjectContext(supabase, projectId);
    const dependencyOutputs = dependencyTasks.map((item: any) => `### ${item.output_label} (${AI_ROLES[item.role as AIRole].label})\n${item.output || "Aucun résultat."}`).join("\n\n");
    const system = `${AI_ROLES[task.role as AIRole].systemPrompt}\n\nTu exécutes une tâche dans un workflow séquentiel. ${task.objective}\nTu dois travailler uniquement à partir des données du projet et des sorties des tâches précédentes. Ne prétends jamais avoir appliqué une modification. ${actionInstruction()}`;
    const userPrompt = `Projet :\n${contextToText(context)}\n\nSorties des dépendances :\n${dependencyOutputs || "Aucune."}\n\nTâche : ${task.output_label}\nObjectif : ${task.objective}\n\nFournis le résultat professionnel de cette tâche. Si une modification de donnée est explicitement nécessaire, propose-la sous forme d'action JSON conforme au mode agent.`;
    const raw = await generateAIResponse([{ role: "system", content: system }, { role: "user", content: userPrompt }]);
    const parsed = parseAIActionResponse(raw);

    const actionIds: string[] = [];
    for (const action of parsed.actions) {
      const valid = validateAction(action);
      if (!valid) continue;
      const { data: saved, error } = await supabase.from("ai_actions").insert({ project_id: projectId, user_id: user.id, action_type: valid.type, payload: valid.payload, status: "proposed" }).select("id").single();
      if (error) throw new Error(error.message);
      actionIds.push(saved.id);
    }

    const nextStatus = actionIds.length ? "waiting_approval" : "completed";
    await supabase.from("ai_tasks").update({ status: nextStatus, output: parsed.answer, action_ids: actionIds, completed_at: nextStatus === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", task.id).eq("user_id", user.id);
    await supabase.from("ai_workflows").update({ status: nextStatus === "waiting_approval" ? "waiting_approval" : "running", updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);

    return NextResponse.json({ ...(await loadWorkflow(supabase, projectId, workflowId, user.id)), result: parsed.answer, actions: actionIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur d'exécution du workflow." }, { status: 500 });
  }
}
