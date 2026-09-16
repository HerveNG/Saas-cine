export type AIPricing = {
  inputPer1M: number;
  outputPer1M: number;
  currency: string;
};

function numberEnv(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function getAIPricing(): AIPricing {
  return {
    inputPer1M: numberEnv("AI_INPUT_PRICE_PER_1M"),
    outputPer1M: numberEnv("AI_OUTPUT_PRICE_PER_1M"),
    currency: process.env.AI_PRICE_CURRENCY || "USD",
  };
}

export function estimateAICost(inputTokens = 0, outputTokens = 0) {
  const pricing = getAIPricing();
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: pricing.currency,
  };
}
