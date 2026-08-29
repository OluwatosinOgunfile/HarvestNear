export const faqKnowledge = [
  { title: "Accounts and checkout", keywords: ["account","signin","sign in","checkout"], answer: "You can browse without an account, but you must sign in before checkout. Consumer and farmer accounts can both purchase produce and access My orders." },
  { title: "Payments", keywords: ["payment","paystack","card","transfer","receipt"], answer: "Paystack is the primary secure payment option. If administrators enable manual transfer, the order remains pending until its receipt is reviewed." },
  { title: "Delivery and pickup", keywords: ["delivery","doorstep","pickup","collect","farmer delivery"], answer: "At checkout, choose distance-priced doorstep delivery, free farm pickup, or arrange delivery directly with the farmer. Availability depends on each farm and your saved location." },
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

export function photoQualityFallback(width: number, height: number, fileSize: number) {
  const warnings:string[]=[];
  if(width<900||height<675)warnings.push("Use a picture at least 900 by 675 pixels for a clearer marketplace preview.");
  if(fileSize>3*1024*1024)warnings.push("Compress this picture below 3 MB before uploading.");
  if(width&&height&&(width/height<1.15||width/height>1.7))warnings.push("A landscape picture close to 4:3 will frame the produce better.");
  return { quality: warnings.length ? "needs_attention" : "ready", warnings };
}
