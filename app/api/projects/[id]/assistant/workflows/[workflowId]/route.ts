import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";
import { getProjectContext, contextToText } from "../../../../../../lib/ai/project-context";
import { AI_ROLES, type AIRole } from "../../../../../../lib/ai/roles";
import { generateAIResponse } from "../../../../../../lib/ai/provider";
import { actionInstruction, parseAIActionResponse } from "../../../../../../lib/ai/action-parser";
import { validateAction } from "../../../../../../lib/ai/actions";

type Params = { params: Promise<{ id: string; workflowId: string }> };

type WorkflowTask = {
  id: string;
  workflow_id: string;
  task_index: number;
  role: AIRole;
  objective: string;
  output_label: string;
  depends_on: number[];
  status: "pending" | "running" | "waiting_approval" | "completed" | "failed";
  output: string | null;
  action_ids: string[];
  error_message: string | null;
};

async function loadWorkflow(supabase: any, projectId: string, workflowId: string, userId: string) {
  const { data: workflow, error } = await supabase
    .from("ai_workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!workflow) throw new Error("Workflow introuvable.");

  const { data: tasks, error: taskError } = await supabase
    .from("ai_tasks")
    .select("*")
    .eq("workflow_id", workflowId)
    .eq("user_id", userId)
    .order("task_index");
  if (taskError) throw new Error(taskError.message);
  return { workflow, tasks: (tasks ?? []) as WorkflowTask[] };
}

async function failTaskAndWorkflow(supabase: any, workflowId: string, taskId: string, userId: string, message: string) {
  const now = new Date().toISOString();
  await supabase.from("ai_tasks").update({
    status: "failed",
    error_message: message.slice(0, 4000),
    updated_at: now,
  }).eq("id", taskId).eq("user_id", userId);

  await supabase.from("ai_workflows").update({
    status: "failed",
    updated_at: now,
  }).eq("id", workflowId).eq("user_id", userId);
}

async function claimPendingTask(supabase: any, task: WorkflowTask, userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_tasks")
    .update({ status: "running", started_at: now, updated_at: now, error_message: null })
    .eq("id", task.id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as WorkflowTask | null;
}

export async function GET(request: Request, { params }: Params) {
  const { id: projectId, workflowId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id: projectId, workflowId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const operation = body.operation === "cancel" ? "cancel" : "run";

  try {
    let loaded = await loadWorkflow(supabase, projectId, workflowId, user.id);

    if (operation === "cancel") {
      if (["completed", "cancelled"].includes(loaded.workflow.status)) return NextResponse.json(loaded);
      await supabase.from("ai_workflows").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
      return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
    }

    if (["completed", "cancelled"].includes(loaded.workflow.status)) return NextResponse.json(loaded);

    if (loaded.workflow.status === "failed") {
      const failedTask = loaded.tasks.find((item) => item.status === "failed");
      if (!failedTask) return NextResponse.json(loaded);

      const now = new Date().toISOString();
      const { data: retried, error: retryError } = await supabase
        .from("ai_tasks")
        .update({ status: "pending", error_message: null, action_ids: [], updated_at: now, started_at: null })
        .eq("id", failedTask.id)
        .eq("user_id", user.id)
        .eq("status", "failed")
        .select("id")
        .maybeSingle();
      if (retryError) throw new Error(retryError.message);
      if (!retried) return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id), { status: 409 });

      await supabase.from("ai_workflows").update({ status: "running", updated_at: now }).eq("id", workflowId).eq("user_id", user.id);
      loaded = await loadWorkflow(supabase, projectId, workflowId, user.id);
    }

    const waitingTask = loaded.tasks.find((item) => item.status === "waiting_approval");
    if (waitingTask) {
      return NextResponse.json({ ...loaded, message: "Cette tâche attend la validation des actions proposées." }, { status: 409 });
    }

    const task = loaded.tasks.find((item) => item.status === "pending");
    if (!task) {
      const workflowCompleted = loaded.tasks.every((item) => item.status === "completed");
      if (workflowCompleted) {
        await supabase.from("ai_workflows").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
      }
      return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
    }

    const dependencies = Array.isArray(task.depends_on) ? task.depends_on : [];
    const dependencyTasks = loaded.tasks.filter((candidate) => dependencies.includes(candidate.task_index));
    if (dependencyTasks.some((candidate) => candidate.status !== "completed")) {
      return NextResponse.json({ error: "Les tâches précédentes doivent être terminées avant celle-ci." }, { status: 409 });
    }

    const claimedTask = await claimPendingTask(supabase, task, user.id);
    if (!claimedTask) {
      return NextResponse.json({ error: "Cette tâche est déjà en cours d'exécution ou a été modifiée." }, { status: 409 });
    }

    await supabase.from("ai_workflows").update({ status: "running", current_task_index: claimedTask.task_index, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);

    try {
      const context = await getProjectContext(supabase, projectId);
      if (!context) throw new Error("Contexte projet introuvable.");

      const dependencyOutputs = dependencyTasks
        .map((item) => `### ${item.output_label} (${AI_ROLES[item.role].label})\n${item.output || "Aucun résultat."}`)
        .join("\n\n");

      const system = `${AI_ROLES[claimedTask.role].systemPrompt}\n\nTu exécutes une tâche dans un workflow séquentiel. ${claimedTask.objective}\nTu dois travailler uniquement à partir des données du projet et des sorties des tâches précédentes. Ne prétends jamais avoir appliqué une modification. ${actionInstruction()}`;
      const userPrompt = `Projet :\n${contextToText(context)}\n\nSorties des dépendances :\n${dependencyOutputs || "Aucune."}\n\nTâche : ${claimedTask.output_label}\nObjectif : ${claimedTask.objective}\n\nFournis le résultat professionnel de cette tâche. Si une modification de donnée est explicitement nécessaire, propose-la sous forme d'action JSON conforme au mode agent.`;

      const raw = await generateAIResponse([
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ]);
      const parsed = parseAIActionResponse(raw);

      const actionIds: string[] = [];
      for (const action of parsed.actions) {
        const valid = validateAction(action);
        if (!valid) continue;
        const { data: saved, error } = await supabase
          .from("ai_actions")
          .insert({
            project_id: projectId,
            user_id: user.id,
            task_id: claimedTask.id,
            action_type: valid.type,
            payload: valid.payload,
            status: "proposed",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        actionIds.push(saved.id);
      }

      const nextStatus = actionIds.length ? "waiting_approval" : "completed";
      const now = new Date().toISOString();
      await supabase.from("ai_tasks").update({
        status: nextStatus,
        output: parsed.answer,
        action_ids: actionIds,
        completed_at: nextStatus === "completed" ? now : null,
        updated_at: now,
      }).eq("id", claimedTask.id).eq("user_id", user.id).eq("status", "running");

      const otherTasksCompleted = loaded.tasks.every((item) => item.id === claimedTask.id || item.status === "completed");
      await supabase.from("ai_workflows").update({
        status: nextStatus === "waiting_approval" ? "waiting_approval" : otherTasksCompleted ? "completed" : "running",
        completed_at: nextStatus === "completed" && otherTasksCompleted ? now : null,
        updated_at: now,
      }).eq("id", workflowId).eq("user_id", user.id);

      return NextResponse.json({ ...(await loadWorkflow(supabase, projectId, workflowId, user.id)), result: parsed.answer, actions: actionIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur d'exécution de l'agent.";
      await failTaskAndWorkflow(supabase, workflowId, claimedTask.id, user.id, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur d'exécution du workflow." }, { status: 500 });
  }
}
