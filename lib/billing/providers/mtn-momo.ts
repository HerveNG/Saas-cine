import type {
  BillingCheckout,
  BillingCheckoutRequest,
  BillingEvent,
  BillingProvider,
} from "../types";

const DEFAULT_SANDBOX_BASE_URL = "https://sandbox.momodeveloper.mtn.com";
const DEFAULT_PRODUCTION_BASE_URL = "https://proxy.momoapi.mtn.com";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuration MTN MoMo manquante: ${name}`);
  return value;
}

function baseUrl() {
  if (process.env.MTN_MOMO_BASE_URL?.trim()) return process.env.MTN_MOMO_BASE_URL.trim();
  return process.env.MTN_MOMO_TARGET_ENV === "production"
    ? DEFAULT_PRODUCTION_BASE_URL
    : DEFAULT_SANDBOX_BASE_URL;
}

async function getAccessToken() {
  const subscriptionKey = required("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
  const apiUser = required("MTN_MOMO_API_USER");
  const apiKey = required("MTN_MOMO_API_KEY");

  const response = await fetch(`${baseUrl()}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MTN MoMo token error (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

function normaliseStatus(value: unknown): BillingEvent["status"] {
  const status = String(value ?? "").toUpperCase();
  if (status === "SUCCESSFUL" || status === "SUCCESS" || status === "PAID") return "paid";
  if (status === "FAILED" || status === "REJECTED") return "failed";
  if (status === "CANCELLED" || status === "CANCELED") return "cancelled";
  return "pending";
}

export class MtnMomoCameroonProvider implements BillingProvider {
  readonly id = "mtn_momo_cm" as const;

  async createCheckout(input: BillingCheckoutRequest): Promise<BillingCheckout> {
    const subscriptionKey = required("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
    const token = await getAccessToken();
    const callbackUrl = required("MTN_MOMO_CALLBACK_URL");

    const response = await fetch(`${baseUrl()}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "X-Reference-Id": input.reference,
        "X-Target-Environment": process.env.MTN_MOMO_TARGET_ENV === "production" ? "mtncameroon" : "sandbox",
        "X-Callback-Url": callbackUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(input.plan.amountXaf),
        currency: process.env.MTN_MOMO_CURRENCY ?? "XAF",
        externalId: input.reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: input.phone,
        },
        payerMessage: `FILMFUND AFRICA - ${input.plan.label}`,
        payeeNote: `Abonnement ${input.plan.label}`,
      }),
      cache: "no-store",
    });

    if (response.status !== 202) {
      const body = await response.text();
      throw new Error(`MTN MoMo RequestToPay error (${response.status}): ${body.slice(0, 500)}`);
    }

    return {
      provider: this.id,
      reference: input.reference,
      externalTransactionId: input.reference,
      status: "pending",
      checkoutUrl: null,
      message: "Demande de paiement envoyée. Le client doit approuver la transaction dans son portefeuille MTN MoMo.",
    };
  }

  async getTransactionStatus(reference: string): Promise<BillingEvent> {
    const subscriptionKey = required("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
    const token = await getAccessToken();

    const response = await fetch(`${baseUrl()}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "X-Target-Environment": process.env.MTN_MOMO_TARGET_ENV === "production" ? "mtncameroon" : "sandbox",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MTN MoMo status error (${response.status}): ${body.slice(0, 500)}`);
    }

    const data = await response.json();
    return {
      provider: this.id,
      eventId: `status:${reference}:${String(data.status ?? "pending")}`,
      reference,
      externalTransactionId: reference,
      status: normaliseStatus(data.status),
      amountXaf: data.amount ? Number(data.amount) : null,
      raw: data,
    };
  }

  async verifyWebhook(rawBody: string): Promise<BillingEvent> {
    const data = JSON.parse(rawBody);
    const reference = String(data.referenceId ?? data.reference ?? data.externalId ?? "").trim();
    if (!reference) throw new Error("Callback MTN MoMo sans référence de transaction.");

    return {
      provider: this.id,
      eventId: String(data.referenceId ?? data.externalId ?? `callback:${reference}:${data.status ?? "unknown"}`),
      reference,
      externalTransactionId: reference,
      status: normaliseStatus(data.status),
      amountXaf: data.amount ? Number(data.amount) : null,
      raw: data,
    };
  }
}
