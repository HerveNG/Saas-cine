export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AIUsage = {
  model: string;
  providerBaseUrl: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AIResponse = {
  content: string;
  usage: AIUsage;
};

async function callProvider(messages: ChatMessage[], jsonMode = false): Promise<AIResponse> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) throw new Error("Assistant IA non configuré : définissez AI_API_KEY et AI_MODEL.");
  const body: Record<string, unknown> = { model, messages, temperature: 0.7 };
  if (jsonMode) body.response_format = { type: "json_object" };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Le fournisseur IA a répondu avec le statut ${response.status}.`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Réponse IA vide.");
  const usage = data?.usage ?? {};
  return {
    content: content.trim(),
    usage: {
      model,
      providerBaseUrl: baseUrl,
      inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
      outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
      totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
    },
  };
}

export async function generateAIResponse(messages: ChatMessage[]) {
  return callProvider(messages, false);
}

export async function generateAIStructuredResponse(messages: ChatMessage[]) {
  const response = await callProvider(messages, true);
  try {
    return JSON.parse(response.content) as unknown;
  } catch {
    throw new Error("Le fournisseur IA a retourné un JSON invalide.");
  }
}
