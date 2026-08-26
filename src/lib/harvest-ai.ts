import "server-only";

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

export const faqKnowledge = [
  { title: "Accounts and checkout", keywords: ["account","signin","sign in","checkout"], answer: "You can browse without an account, but you must sign in before checkout. Consumer and farmer accounts can both purchase produce and access My orders." },
  { title: "Payments", keywords: ["payment","paystack","card","transfer","receipt"], answer: "Paystack is the primary secure payment option. If administrators enable manual transfer, the order remains pending until its receipt is reviewed." },
  { title: "Delivery and pickup", keywords: ["delivery","doorstep","pickup","collect","farmer"], answer: "At checkout, choose distance-priced doorstep delivery, free farm pickup, or arrange delivery directly with the farmer. Availability depends on each farm and your saved location." },
  { title: "Orders and tracking", keywords: ["order","track","received","receipt","status"], answer: "Open My orders to track each product separately. Confirm an item only after receiving and checking it; you can then rate the supplying farm." },
  { title: "Refunds and cancellation", keywords: ["refund","cancel","return","credit"], answer: "Pending-payment orders can be cancelled before payment approval. Eligible returns and refunds are handled through the order and support workflows, with account credit available where offered." },
  { title: "Farm listings", keywords: ["listing","stock","harvest","produce","available"], answer: "Verified farmers publish produce, quantities, harvest dates and optional availability dates. Stock is checked again at checkout and listings become out of stock when exhausted." },
  { title: "Farmer payouts", keywords: ["payout","earnings","bank","settlement"], answer: "Each farm has its own payout account. Fulfilled eligible earnings can be requested from the farmer workspace and followed in payout history." },
  { title: "Support", keywords: ["support","problem","issue","help","complaint"], answer: "Create a support ticket from Help and feedback. Include the order number, affected item, what you expected and what happened." },
] as const;

export function groundedFaqFallback(question: string) {
  const query = question.toLowerCase();
  const ranked = faqKnowledge.map((item) => ({ item, score: item.keywords.reduce((sum, word) => sum + (query.includes(word) ? 1 : 0), 0) })).sort((a,b) => b.score-a.score);
  return ranked[0]?.score ? ranked[0].item : null;
}

export function listingFallback(notes: string, categories: { id: string; name: string }[]) {
  const clean = notes.trim().replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const category = categories.find((item) => lower.includes(item.name.toLowerCase().replace(/s$/, "")))
    || categories.find((item) => ({ poultry:["chicken","turkey","egg","chick"], fruits:["fruit","mango","orange","banana","plantain","avocado","watermelon"], vegetables:["vegetable","tomato","spinach","okra","cucumber","carrot","ugwu"], tubers:["yam","cassava","potato"], grains:["rice","maize","corn","grain"] }[item.name.toLowerCase()] || []).some((word) => lower.includes(word)));
  const title = clean.split(/[,.]/)[0].split(" ").slice(0,5).map((word) => word ? word[0].toUpperCase()+word.slice(1).toLowerCase() : word).join(" ") || "Fresh produce";
  return { title, description: clean, categoryId: category?.id || "", categoryName: category?.name || "", unit: lower.includes("basket") ? "basket" : lower.includes("bag") ? "bag" : lower.includes("bunch") ? "bunch" : lower.includes("crate") ? "crate" : "piece", badge: lower.includes("today") ? "Picked today" : "Fresh harvest" };
}

export function ticketSummaryFallback(subject: string, category: string, messages: string[]) {
  const detail = messages.join(" ").replace(/\s+/g," ").slice(0,360);
  return `${category.replaceAll("_"," ")} issue: ${subject}. ${detail}`.slice(0,600);
}
