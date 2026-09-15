type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function generateAIResponse(messages: ChatMessage[]) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL;

  if (!apiKey || !model) throw new Error("Assistant IA non configuré : définissez AI_API_KEY et AI_MODEL.");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Le fournisseur IA a répondu avec le statut ${response.status}.`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Réponse IA vide.");
  return content.trim();
}
