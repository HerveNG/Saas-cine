type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callProvider(messages: ChatMessage[], jsonMode = false) {
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
  return content.trim();
}

export async function generateAIResponse(messages: ChatMessage[]) {
  return callProvider(messages, false);
}

export async function generateAIStructuredResponse(messages: ChatMessage[]) {
  const content = await callProvider(messages, true);
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("Le fournisseur IA a retourné un JSON invalide.");
  }
}
