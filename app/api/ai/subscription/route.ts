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

export async function PATCH() {
  return NextResponse.json({
    error: "Le changement de plan payant passe désormais par Mobile Money.",
    providers: ["orange_money_cm", "mtn_momo_cm"],
    checkoutEndpoint: "/api/billing/checkout",
  }, { status: 410 });
}
