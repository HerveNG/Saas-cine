import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase-server";
import { getProjectContext, contextToText } from "../../../../../../lib/ai/project-context";
import { AI_ROLES, type AIRole } from "../../../../../../lib/ai/roles";
import { generateObservedAIResponse } from "../../../../../../lib/ai/observability";
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

const DOCUMENT_OUTPUT_INSTRUCTIONS: Record<string, string> = {
  "Pack narratif": "Le livrable doit contenir une logline améliorée et un synopsis professionnel. Propose une action create_document de type synopsis avec le synopsis finalisé. Si des personnages doivent être créés ou enrichis, propose aussi les actions create_character nécessaires.",
  "Note de réalisation": "Le livrable doit contenir une note de réalisation exploitable dans un dossier professionnel. Propose une action create_document de type director_note avec le texte finalisé.",
  "Cadre de production": "Le livrable doit structurer le dispositif de production, les besoins, les étapes, les ressources et les risques. Propose une action create_document de type production_schedule avec le plan de production finalisé.",
  "Plan de financement": "Le livrable doit présenter une stratégie de financement structurée, les sources possibles, les besoins et les hypothèses. Propose une action create_document de type financing_plan avec le contenu finalisé.",
  "Budget prévisionnel": "Le livrable doit présenter un budget prévisionnel cohérent avec les données disponibles. Propose une action create_document de type budget avec un tableau lisible et des totaux clairement identifiés. N'invente pas de devis réels : marque les montants comme hypothèses lorsque les données manquent.",
  "Contrôle de cohérence": "Analyse la cohérence entre synopsis, vision, production, budget et financement. Si une correction documentaire est nécessaire, propose uniquement les update_document justifiées par les écarts constatés. Ne remplace pas silencieusement un document existant.",
  "Validation de cohérence": "Effectue un contrôle qualité transversal. Ne crée pas de faux document de validation : produis un rapport clair avec OK, avertissements, contradictions et corrections recommandées. Ne propose une modification documentaire que si elle est directement justifiée.",
  "Validation producteur": "Contrôle la faisabilité, les ressources, le calendrier, le budget et le financement. Produis un rapport de contrôle structuré et vérifiable.",
  "Validation diffuseur": "Contrôle la lisibilité éditoriale, la cohérence du format, du public, du synopsis et de la vision artistique. Produis un rapport de contrôle structuré.",
  "Validation fonds africain": "Contrôle narration, ancrage culturel, impact, production, budget et financement. Produis un rapport de contrôle structuré avec corrections vérifiables.",
  "Validation institutionnelle": "Contrôle clarté, cohérence, faisabilité et caractère vérifiable des éléments présentés à une institution. Produis un rapport de contrôle.",
  "Validation investisseur": "Contrôle cohérence économique, financière, narrative et productive. Ne promets aucun rendement. Produis un rapport de contrôle structuré.",
  "Validation pitch": "Contrôle clarté, cohérence et absence de contradictions dans le pitch. Produis un rapport de contrôle bref et exploitable.",
  "Impact culturel et territorial": "Produis une analyse factuelle de la pertinence culturelle, de l'ancrage territorial, des publics, de la transmission et de l'impact potentiel. Distingue faits, hypothèses et propositions. Ne crée pas de document persistant sauf si explicitement demandé.",
  "Checklist et pitch": "Construis une checklist professionnelle des pièces et informations à vérifier avant soumission. Si pertinent, propose une action create_document de type pitch_deck.",
  "Checklist fonds africain": "Construis une checklist spécifique de candidature : pièces, cohérence, éléments culturels, impact, budget, financement et points à confirmer. Si pertinent, propose une action create_document de type pitch_deck.",
  "Pitch diffuseur": "Construis la structure finale du pitch deck diffuseur. Propose une action create_document de type pitch_deck avec le contenu finalisé.",
  "Pitch investisseur": "Construis la structure finale du pitch deck investisseur, sans promesse financière non étayée. Propose une action create_document de type pitch_deck.",
  "Pitch deck": "Construis la structure finale du pitch deck. Propose une action create_document de type pitch_deck avec le contenu finalisé.",
};

async function loadWorkflow(supabase: any, projectId: string, workflowId: string, userId: string) {
  const { data: workflow, error } = await supabase.from("ai_workflows").select("*").eq("id", workflowId).eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!workflow) throw new Error("Workflow introuvable.");
  const { data: tasks, error: taskError } = await supabase.from("ai_tasks").select("*").eq("workflow_id", workflowId).eq("user_id", userId).order("task_index");
  if (taskError) throw new Error(taskError.message);
  return { workflow, tasks: (tasks ?? []) as WorkflowTask[] };
}

async function failTaskAndWorkflow(supabase: any, workflowId: string, taskId: string, userId: string, message: string) {
  const now = new Date().toISOString();
  await supabase.from("ai_tasks").update({ status: "failed", error_message: message.slice(0, 4000), updated_at: now }).eq("id", taskId).eq("user_id", userId);
  await supabase.from("ai_workflows").update({ status: "failed", updated_at: now }).eq("id", workflowId).eq("user_id", userId);
}

async function claimPendingTask(supabase: any, task: WorkflowTask, userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("ai_tasks").update({ status: "running", started_at: now, updated_at: now, error_message: null }).eq("id", task.id).eq("user_id", userId).eq("status", "pending").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data as WorkflowTask | null;
}

export async function GET(request: Request, { params }: Params) {
  const { id: projectId, workflowId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur." }, { status: 404 }); }
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
      const { data: retried, error: retryError } = await supabase.from("ai_tasks").update({ status: "pending", error_message: null, action_ids: [], updated_at: now, started_at: null }).eq("id", failedTask.id).eq("user_id", user.id).eq("status", "failed").select("id").maybeSingle();
      if (retryError) throw new Error(retryError.message);
      if (!retried) return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id), { status: 409 });
      await supabase.from("ai_workflows").update({ status: "running", updated_at: now }).eq("id", workflowId).eq("user_id", user.id);
      loaded = await loadWorkflow(supabase, projectId, workflowId, user.id);
    }
    const waitingTask = loaded.tasks.find((item) => item.status === "waiting_approval");
    if (waitingTask) return NextResponse.json({ ...loaded, message: "Cette tâche attend la validation des actions proposées." }, { status: 409 });
    const task = loaded.tasks.find((item) => item.status === "pending");
    if (!task) {
      const workflowCompleted = loaded.tasks.every((item) => item.status === "completed");
      if (workflowCompleted) await supabase.from("ai_workflows").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
      return NextResponse.json(await loadWorkflow(supabase, projectId, workflowId, user.id));
    }
    const dependencies = Array.isArray(task.depends_on) ? task.depends_on : [];
    const dependencyTasks = loaded.tasks.filter((candidate) => dependencies.includes(candidate.task_index));
    if (dependencyTasks.some((candidate) => candidate.status !== "completed")) return NextResponse.json({ error: "Les tâches précédentes doivent être terminées avant celle-ci." }, { status: 409 });
    const claimedTask = await claimPendingTask(supabase, task, user.id);
    if (!claimedTask) return NextResponse.json({ error: "Cette tâche est déjà en cours d'exécution ou a été modifiée." }, { status: 409 });
    await supabase.from("ai_workflows").update({ status: "running", current_task_index: claimedTask.task_index, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("user_id", user.id);
    try {
      const context = await getProjectContext(supabase, projectId);
      if (!context) throw new Error("Contexte projet introuvable.");
      const dependencyOutputs = dependencyTasks.map((item) => `### ${item.output_label} (${AI_ROLES[item.role].label})\n${item.output || "Aucun résultat."}`).join("\n\n");
      const deliverableInstruction = DOCUMENT_OUTPUT_INSTRUCTIONS[claimedTask.output_label] || "Produis un livrable professionnel directement exploitable dans le dossier. Si une donnée persistante doit être créée ou modifiée, propose une action JSON conforme au mode agent.";
      const system = `${AI_ROLES[claimedTask.role].system}\n\nTu exécutes une tâche dans un workflow séquentiel. ${claimedTask.objective}\nTu dois travailler uniquement à partir des données du projet et des sorties des tâches précédentes. Ne prétends jamais avoir appliqué une modification.\n\nRÈGLE DE LIVRABLE : ${deliverableInstruction}\n\nLes documents proposés doivent être autonomes, professionnels, rédigés en français et directement réutilisables dans un dossier audiovisuel. Évite les placeholders vagues. Lorsque l'information manque, signale explicitement une hypothèse, une donnée à confirmer ou une lacune au lieu de l'inventer.\n\n${actionInstruction()}`;
      const userPrompt = `Projet :\n${contextToText(context)}\n\nSorties des dépendances :\n${dependencyOutputs || "Aucune."}\n\nTâche : ${claimedTask.output_label}\nObjectif : ${claimedTask.objective}\n\nFournis d'abord le livrable professionnel dans ta réponse. Puis, si le livrable doit être conservé dans le projet, propose les actions JSON nécessaires. Pour une création de document, utilise exactement un type autorisé parmi : synopsis, intent_note, director_note, bible, pitch_deck, scenario, technical_breakdown, budget, financing_plan, production_schedule.`;
      const response = await generateObservedAIResponse([{ role: "system", content: system }, { role: "user", content: userPrompt }], { supabase, workflowId, taskId: claimedTask.id, projectId, userId: user.id, role: claimedTask.role });
      const raw = response.content;
      const parsed = parseAIActionResponse(raw);
      const actionIds: string[] = [];
      for (const action of parsed.actions) {
        const valid = validateAction(action);
        if (!valid) continue;
        const { data: saved, error } = await supabase.from("ai_actions").insert({ project_id: projectId, user_id: user.id, task_id: claimedTask.id, action_type: valid.type, payload: valid.payload, status: "proposed" }).select("id").single();
        if (error) throw new Error(error.message);
        actionIds.push(saved.id);
      }
      if (actionIds.length) await supabase.from("ai_agent_runs").update({ action_count: actionIds.length }).eq("task_id", claimedTask.id).eq("user_id", user.id).eq("status", "completed");
      const nextStatus = actionIds.length ? "waiting_approval" : "completed";
      const now = new Date().toISOString();
      await supabase.from("ai_tasks").update({ status: nextStatus, output: parsed.answer, action_ids: actionIds, completed_at: nextStatus === "completed" ? now : null, updated_at: now }).eq("id", claimedTask.id).eq("user_id", user.id).eq("status", "running");
      const otherTasksCompleted = loaded.tasks.every((item) => item.id === claimedTask.id || item.status === "completed");
      await supabase.from("ai_workflows").update({ status: nextStatus === "waiting_approval" ? "waiting_approval" : otherTasksCompleted ? "completed" : "running", completed_at: nextStatus === "completed" && otherTasksCompleted ? now : null, updated_at: now }).eq("id", workflowId).eq("user_id", user.id);
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
