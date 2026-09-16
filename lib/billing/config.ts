import type { BillingPlan, BillingProviderId } from "./types";

export const BILLING_PROVIDER_ENV = "BILLING_PROVIDER";

export function getBillingProviderId(): BillingProviderId | null {
  const value = process.env[BILLING_PROVIDER_ENV]?.trim();
  if (value === "orange_money_cm" || value === "mtn_momo_cm") return value;
  return null;
}

export function getBillingPlan(planId: string): BillingPlan | null {
  const plans: Record<string, BillingPlan> = {
    creator: { id: "creator", label: "Creator", amountXaf: Number(process.env.AI_PLAN_CREATOR_PRICE_XAF ?? 5000), interval: "month" },
    pro: { id: "pro", label: "Pro", amountXaf: Number(process.env.AI_PLAN_PRO_PRICE_XAF ?? 15000), interval: "month" },
    studio: { id: "studio", label: "Studio", amountXaf: Number(process.env.AI_PLAN_STUDIO_PRICE_XAF ?? 35000), interval: "month" },
  };
  return plans[planId] ?? null;
}
