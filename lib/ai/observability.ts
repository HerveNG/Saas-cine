import { generateAIResponse, type ChatMessage } from "./provider";
import { assertAIQuota } from "./quota";

export type AgentRunContext = {
  supabase: any;
  workflowId: string | null;
  taskId: string | null;
  projectId: string;
  userId: string;
  role: string;
};

export async function generateObservedAIResponse(messages: ChatMessage[], context: AgentRunContext) {
  await assertAIQuota(context.supabase, context.userId);

  const startedAt = Date.now();
  const startedIso = new Date().toISOString();
  const { data: run, error: insertError } = await context.supabase
    .from("ai_agent_runs")
    .insert({
      workflow_id: context.workflowId,
      task_id: context.taskId,
      project_id: context.projectId,
      user_id: context.userId,
      role: context.role,
      status: "running",
      started_at: startedIso,
    })
    .select("id")
    .single();

  if (insertError || !run) {
    throw new Error(`Impossible d'initialiser le suivi de l'exécution IA : ${insertError?.message || "run introuvable"}`);
  }

  try {
    const response = await generateAIResponse(messages);
    const durationMs = Date.now() - startedAt;
    await context.supabase.from("ai_agent_runs").update({
      status: "completed",
      model: response.usage.model,
      provider_base_url: response.usage.providerBaseUrl,
      input_tokens: response.usage.inputTokens,
      output_tokens: response.usage.outputTokens,
      total_tokens: response.usage.totalTokens,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id).eq("user_id", context.userId);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur d'exécution IA.";
    await context.supabase.from("ai_agent_runs").update({
      status: "failed",
      duration_ms: Date.now() - startedAt,
      error_message: message.slice(0, 4000),
      completed_at: new Date().toISOString(),
    }).eq("id", run.id).eq("user_id", context.userId);
    throw error;
  }
}
