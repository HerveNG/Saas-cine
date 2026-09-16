import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";
import { estimateAICost, getAIPricing } from "../../../../../lib/ai/pricing";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id: projectId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: project } = await supabase.from("projects").select("id,title").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });

  const { data: runs, error } = await supabase
    .from("ai_agent_runs")
    .select("id,workflow_id,task_id,role,model,status,input_tokens,output_tokens,total_tokens,duration_ms,action_count,error_message,started_at,completed_at,created_at")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const workflowIds = [...new Set((runs ?? []).map((run) => run.workflow_id).filter(Boolean))];
  const { data: workflows, error: workflowError } = workflowIds.length
    ? await supabase.from("ai_workflows").select("id,title,package_id,status").in("id", workflowIds).eq("user_id", user.id)
    : { data: [], error: null };
  if (workflowError) return NextResponse.json({ error: workflowError.message }, { status: 500 });

  const workflowMap = new Map((workflows ?? []).map((workflow) => [workflow.id, workflow]));
  const pricing = getAIPricing();
  const enriched = (runs ?? []).map((run) => ({
    ...run,
    workflow: run.workflow_id ? workflowMap.get(run.workflow_id) ?? null : null,
    cost: estimateAICost(run.input_tokens ?? 0, run.output_tokens ?? 0),
  }));

  const totals = enriched.reduce((acc, run) => {
    acc.inputTokens += run.input_tokens ?? 0;
    acc.outputTokens += run.output_tokens ?? 0;
    acc.totalTokens += run.total_tokens ?? (run.input_tokens ?? 0) + (run.output_tokens ?? 0);
    acc.durationMs += run.duration_ms ?? 0;
    acc.actions += run.action_count ?? 0;
    acc.cost += run.cost.totalCost;
    if (run.status === "completed") acc.completed += 1;
    if (run.status === "failed") acc.failed += 1;
    return acc;
  }, { inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs: 0, actions: 0, cost: 0, completed: 0, failed: 0 });

  const byRole = new Map<string, { role: string; runs: number; tokens: number; cost: number; durationMs: number }>();
  const byPackage = new Map<string, { packageId: string; runs: number; tokens: number; cost: number }>();
  for (const run of enriched) {
    const role = byRole.get(run.role) ?? { role: run.role, runs: 0, tokens: 0, cost: 0, durationMs: 0 };
    role.runs += 1; role.tokens += run.total_tokens ?? 0; role.cost += run.cost.totalCost; role.durationMs += run.duration_ms ?? 0;
    byRole.set(run.role, role);
    const packageId = run.workflow?.package_id || "workflow_general";
    const pack = byPackage.get(packageId) ?? { packageId, runs: 0, tokens: 0, cost: 0 };
    pack.runs += 1; pack.tokens += run.total_tokens ?? 0; pack.cost += run.cost.totalCost;
    byPackage.set(packageId, pack);
  }

  return NextResponse.json({
    project,
    pricing,
    totals: { ...totals, cost: Number(totals.cost.toFixed(6)) },
    byRole: [...byRole.values()].map((item) => ({ ...item, cost: Number(item.cost.toFixed(6)) })).sort((a, b) => b.tokens - a.tokens),
    byPackage: [...byPackage.values()].map((item) => ({ ...item, cost: Number(item.cost.toFixed(6)) })).sort((a, b) => b.tokens - a.tokens),
    runs: enriched,
  });
}
