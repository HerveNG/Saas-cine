import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";
import { getBillingPlan, getBillingProviderId } from "../../../../lib/billing/config";
import { getBillingProvider } from "../../../../lib/billing/providers";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!planId || !phone) {
    return NextResponse.json({ error: "planId et phone sont obligatoires." }, { status: 400 });
  }

  const plan = getBillingPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan payant inconnu." }, { status: 400 });

  const providerId = getBillingProviderId();
  const provider = getBillingProvider();
  if (!providerId || !provider) {
    return NextResponse.json({
      error: "Le paiement Mobile Money n'est pas encore configuré.",
      availableProviders: ["orange_money_cm", "mtn_momo_cm"],
      plan,
    }, { status: 503 });
  }

  const reference = `FF-${user.id.slice(0, 8)}-${Date.now()}`;

  const { error: transactionError } = await supabase
    .from("billing_transactions")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      provider: providerId,
      reference,
      phone,
      amount_xaf: plan.amountXaf,
      status: "pending",
    });

  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 500 });
  }

  try {
    const checkout = await provider.createCheckout({
      userId: user.id,
      email: user.email,
      phone,
      plan,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/projects/billing/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/projects/billing/cancelled`,
      reference,
    });

    return NextResponse.json({ checkout });
  } catch (error) {
    await supabase
      .from("billing_transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("reference", reference)
      .eq("user_id", user.id);

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Impossible d'initialiser le paiement.",
      reference,
    }, { status: 502 });
  }
}
