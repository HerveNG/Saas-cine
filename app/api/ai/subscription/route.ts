import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: subscription, error } = await supabase
    .from("ai_subscriptions")
    .select("user_id,plan_id,status,provider,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscription) return NextResponse.json({ error: "Abonnement IA introuvable." }, { status: 404 });

  const { data: plan } = await supabase
    .from("ai_plans")
    .select("id,label,monthly_token_limit,monthly_run_limit,active")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  return NextResponse.json({ subscription, plan: plan ?? null });
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  if (!planId) return NextResponse.json({ error: "planId est obligatoire." }, { status: 400 });

  // This endpoint is intentionally limited to local plan selection.
  // Payment-provider activation will be handled separately once billing is connected.
  const { data: quota, error } = await supabase.rpc("set_ai_user_plan", {
    p_user_id: user.id,
    p_plan_id: planId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: subscription, error: subscriptionError } = await supabase
    .from("ai_subscriptions")
    .upsert({ user_id: user.id, plan_id: planId, status: "active", updated_at: new Date().toISOString() })
    .select("user_id,plan_id,status,provider,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at")
    .single();

  if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
  return NextResponse.json({ subscription, quota });
}
