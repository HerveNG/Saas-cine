import { getBillingProviderId } from "../config";
import type { BillingProvider } from "../types";

export function getBillingProvider(): BillingProvider | null {
  const provider = getBillingProviderId();
  if (!provider) return null;

  // Provider adapters are intentionally not activated until the official
  // Orange Money / MTN MoMo merchant credentials are configured.
  return null;
}
