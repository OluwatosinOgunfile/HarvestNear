import "server-only";
export { faqKnowledge, groundedFaqFallback, listingFallback, photoQualityFallback, ticketSummaryFallback } from "@/lib/ai-fallbacks";

const endpoint = () => {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!account || !token) return null;
  return { url: `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct"}`, token };
};

function jsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { return null; }
}

export async function runStructuredAi(system: string, prompt: string) {
  const target = endpoint();
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${target.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 420, temperature: 0.15 }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: { response?: string } };
    return jsonObject(String(payload.result?.response || ""));
  } catch { return null; } finally { clearTimeout(timer); }
}
