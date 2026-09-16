import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";
import { getBillingProvider } from "../../../../../lib/billing/providers";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { reference } = await params;
  const { data: transaction, error } = await supabase
    .from("billing_transactions")
    .select("id,user_id,plan_id,provider,reference,external_transaction_id,phone,amount_xaf,status,paid_at,created_at,updated_at")
    .eq("reference", reference)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!transaction) return NextResponse.json({ error: "Transaction introuvable." }, { status: 404 });

  if (transaction.status === "pending") {
    const provider = getBillingProvider();
    if (provider) {
      try {
        const event = await provider.getTransactionStatus(transaction.reference);
        const admin = getSupabaseAdmin();

        if (event.status === "paid") {
          const { error: quotaError } = await admin.rpc("set_ai_user_plan", {
            p_user_id: transaction.user_id,
            p_plan_id: transaction.plan_id,
          });
          if (quotaError) throw quotaError;

          const start = new Date();
          const end = new Date(start);
          end.setMonth(end.getMonth() + 1);

          await admin.from("ai_subscriptions").upsert({
            user_id: transaction.user_id,
            plan_id: transaction.plan_id,
            status: "active",
            provider: transaction.provider,
            provider_subscription_id: event.externalTransactionId ?? transaction.reference,
            current_period_start: start.toISOString(),
            current_period_end: end.toISOString(),
            cancel_at_period_end: false,
            updated_at: start.toISOString(),
          });

          await admin.from("billing_transactions").update({
            status: "paid",
            external_transaction_id: event.externalTransactionId ?? transaction.reference,
            raw_response: event.raw,
            paid_at: start.toISOString(),
            updated_at: start.toISOString(),
          }).eq("id", transaction.id);
        } else if (event.status === "failed" || event.status === "cancelled") {
          await admin.from("billing_transactions").update({
            status: event.status,
            external_transaction_id: event.externalTransactionId ?? transaction.reference,
            raw_response: event.raw,
            updated_at: new Date().toISOString(),
          }).eq("id", transaction.id);
        }
      } catch (pollError) {
        return NextResponse.json({
          transaction,
          providerStatusError: pollError instanceof Error ? pollError.message : "Erreur de vérification du paiement.",
        });
      }
    }
  }

  const { data: latest } = await supabase
    .from("billing_transactions")
    .select("id,user_id,plan_id,provider,reference,external_transaction_id,phone,amount_xaf,status,paid_at,created_at,updated_at")
    .eq("reference", reference)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ transaction: latest ?? transaction });
}
