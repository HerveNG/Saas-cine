export type BillingProviderId = "orange_money_cm" | "mtn_momo_cm";

export type BillingPlan = {
  id: string;
  label: string;
  amountXaf: number;
  interval: "month";
};

export type BillingCheckoutRequest = {
  userId: string;
  email?: string | null;
  phone: string;
  plan: BillingPlan;
  successUrl: string;
  cancelUrl: string;
  reference: string;
};

export type BillingCheckout = {
  provider: BillingProviderId;
  reference: string;
  externalTransactionId?: string | null;
  status: "pending" | "paid" | "failed";
  checkoutUrl?: string | null;
  message?: string | null;
};

export type BillingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired";

export type BillingEvent = {
  provider: BillingProviderId;
  eventId: string;
  reference: string;
  externalTransactionId?: string | null;
  status: "pending" | "paid" | "failed" | "cancelled";
  amountXaf?: number | null;
  raw: unknown;
};

export interface BillingProvider {
  readonly id: BillingProviderId;
  createCheckout(input: BillingCheckoutRequest): Promise<BillingCheckout>;
  getTransactionStatus(reference: string): Promise<BillingEvent>;
  verifyWebhook(rawBody: string, signature?: string | null): Promise<BillingEvent>;
}
