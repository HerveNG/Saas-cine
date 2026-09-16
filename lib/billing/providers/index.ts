import { getBillingProviderId } from "../config";
import type { BillingProvider } from "../types";
import { MtnMomoCameroonProvider } from "./mtn-momo";

export function getBillingProvider(): BillingProvider | null {
  const provider = getBillingProviderId();
  if (!provider) return null;

  if (provider === "mtn_momo_cm") return new MtnMomoCameroonProvider();

  // Orange Money remains disabled until its official merchant API
  // credentials and contract-specific endpoints are configured.
  return null;
}
