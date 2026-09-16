export type AIQuota = {
  allowed: boolean;
  planId: string;
  planLabel: string;
  monthlyTokenLimit: number;
  monthlyRunLimit: number;
  usedTokens: number;
  usedRuns: number;
  remainingTokens: number;
  remainingRuns: number;
  periodStart: string;
  reason: string | null;
};

export async function getAIQuota(supabase: any, userId: string): Promise<AIQuota> {
  const { data, error } = await supabase.rpc("check_ai_quota", { p_user_id: userId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Quota IA introuvable.");
  return {
    allowed: Boolean(row.allowed),
    planId: row.plan_id,
    planLabel: row.plan_label,
    monthlyTokenLimit: Number(row.monthly_token_limit),
    monthlyRunLimit: Number(row.monthly_run_limit),
    usedTokens: Number(row.used_tokens),
    usedRuns: Number(row.used_runs),
    remainingTokens: Number(row.remaining_tokens),
    remainingRuns: Number(row.remaining_runs),
    periodStart: row.period_start,
    reason: row.reason ?? null,
  };
}

export async function assertAIQuota(supabase: any, userId: string) {
  const quota = await getAIQuota(supabase, userId);
  if (!quota.allowed) {
    const reason = quota.reason === "monthly_token_limit"
      ? "Votre quota mensuel de tokens IA est atteint."
      : "Votre nombre maximal d'exécutions IA pour ce mois est atteint.";
    const error = new Error(reason);
    (error as Error & { code?: string; quota?: AIQuota }).code = "AI_QUOTA_EXCEEDED";
    (error as Error & { code?: string; quota?: AIQuota }).quota = quota;
    throw error;
  }
  return quota;
}
