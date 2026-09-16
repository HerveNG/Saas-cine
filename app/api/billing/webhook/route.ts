import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getBillingProviderId } from "../../../../lib/billing/config";
import { MtnMomoCameroonProvider } from "../../../../lib/billing/providers/mtn-momo";
import type { BillingEvent } from "../../../../lib/billing/types";

function getProvider() {
  const providerId = getBillingProviderId();
  if (providerId === "mtn_momo_cm") return new MtnMomoCameroonProvider();
  return null;
}

export async function POST(request: Request) {
  const providerId = getBillingProviderId();
  if (!providerId) {
    return NextResponse.json({ error: "BILLING_PROVIDER non configuré." }, { status: 503 });
  }

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json({ error: `Webhook non implémenté pour ${providerId}.` }, { status: 501 });
  }

  const rawBody = await request.text();
  let event: BillingEvent;

  try {
    event = await provider.verifyWebhook(rawBody, request.headers.get("x-signature"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook invalide." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: insertedEvent, error: eventInsertError } = await admin
    .from("billing_events")
    .insert({
      provider: event.provider,
      event_id: event.eventId,
      event_type: event.status,
      transaction_reference: event.reference,
      payload: event.raw,
    })
    .select("id")
    .maybeSingle();

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: eventInsertError.message }, { status: 500 });
  }

  const { data: transaction, error: transactionError } = await admin
    .from("billing_transactions")
    .select("id,user_id,plan_id,provider,reference,amount_xaf,status")
    .eq("provider", event.provider)
    .eq("reference", event.reference)
    .maybeSingle();

  if (transactionError) {
    await admin.from("billing_events").update({ status: "failed", error_message: transactionError.message }).eq("id", insertedEvent?.id);
    return NextResponse.json({ error: transactionError.message }, { status: 500 });
  }

  if (!transaction) {
    await admin.from("billing_events").update({ status: "ignored", error_message: "Transaction interne introuvable." }).eq("id", insertedEvent?.id);
    return NextResponse.json({ received: true, ignored: true });
  }

  if (event.amountXaf !== null && event.amountXaf !== undefined && event.amountXaf !== Number(transaction.amount_xaf)) {
    await admin.from("billing_events").update({ status: "failed", error_message: "Montant du callback différent du montant de la commande." }).eq("id", insertedEvent?.id);
    await admin.from("billing_transactions").update({ status: "failed", raw_response: event.raw, updated_at: new Date().toISOString() }).eq("id", transaction.id);
    return NextResponse.json({ error: "Montant de transaction invalide." }, { status: 400 });
  }

  if (event.status === "paid") {
    const { error: quotaError } = await admin.rpc("set_ai_user_plan", {
      p_user_id: transaction.user_id,
      p_plan_id: transaction.plan_id,
    });

    if (quotaError) {
      await admin.from("billing_events").update({ status: "failed", error_message: quotaError.message }).eq("id", insertedEvent?.id);
      return NextResponse.json({ error: quotaError.message }, { status: 500 });
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    await admin.from("ai_subscriptions").upsert({
      user_id: transaction.user_id,
      plan_id: transaction.plan_id,
      status: "active",
      provider: transaction.provider,
      provider_customer_id: null,
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

  await admin.from("billing_events").update({
    status: "processed",
    processed_at: new Date().toISOString(),
  }).eq("id", insertedEvent?.id);

  return NextResponse.json({ received: true, status: event.status });
}
