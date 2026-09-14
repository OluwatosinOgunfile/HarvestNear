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

/**
 * What a farmer's free-text note is most likely to be, for every category the marketplace has
 * rather than only the five it began with.
 *
 * Order decides the answer wherever the words nest, and several of these do. Seedlings claim "seed
 * yam" before tubers see "yam"; oils claim "groundnut oil" and "coconut" before the bare "nut";
 * legumes claim "bambara nut" for the same reason; dairy claims "cow milk" before livestock sees
 * "cow"; livestock claims "beef" before bee products read the "bee" inside it; vegetables claim
 * "garden egg" and "sweet corn" before eggs and grains claim them; and eggs come before poultry so
 * "chicken eggs" files as eggs rather than as a bird.
 */
const categoryKeywords: { name: string; words: string[] }[] = [
  { name: "Seedlings & Planting Material", words: ["seedling", "planting material", "nursery", "seed yam", "cassava cutting", "sucker"] },
  { name: "Oils & Palm Produce", words: ["palm oil", "red oil", "palm kernel", "groundnut oil", "coconut oil", "vegetable oil", "cooking oil", "coconut", "shea"] },
  { name: "Legumes & Pulses", words: ["cowpea", "soybean", "soya bean", "bambara", "honey bean", "brown bean", "legume", "pulse", "bean"] },
  { name: "Nuts & Seeds", words: ["groundnut", "cashew", "tigernut", "sesame", "melon seed", "egusi", "walnut", "nut", "seed"] },
  { name: "Herbs & Spices", words: ["ginger", "garlic", "turmeric", "scent leaf", "uziza", "ehuru", "curry leaf", "herb", "spice", "seasoning"] },
  { name: "Leafy Greens", words: ["ugwu", "bitter leaf", "waterleaf", "spinach", "shoko", "leafy", "leaf vegetable"] },
  { name: "Peppers & Chillies", words: ["scotch bonnet", "tatashe", "shombo", "atarodo", "chilli", "chili", "pepper"] },
  { name: "Mushrooms", words: ["mushroom"] },
  { name: "Fish & Aquaculture", words: ["catfish", "tilapia", "mackerel", "smoked fish", "fish", "aquaculture", "seafood", "prawn"] },
  { name: "Dairy Products", words: ["wara", "nono", "yoghurt", "yogurt", "cheese", "fresh milk", "milk", "dairy"] },
  { name: "Livestock & Meat", words: ["beef", "mutton", "goat", "ram", "cattle", "cow", "livestock", "meat"] },
  { name: "Honey & Bee Products", words: ["honey", "comb honey", "beeswax", "apiary", "bee"] },
  { name: "Vegetables", words: ["tomato", "okra", "okro", "cucumber", "carrot", "onion", "garden egg", "cabbage", "sweet corn", "vegetable"] },
  { name: "Eggs", words: ["egg"] },
  { name: "Poultry", words: ["chicken", "turkey", "duck", "guinea fowl", "broiler", "cockerel", "chick", "poultry", "bird"] },
  { name: "Tubers", words: ["yam", "cassava", "potato", "cocoyam", "tuber"] },
  { name: "Fruits", words: ["mango", "orange", "banana", "plantain", "avocado", "watermelon", "pineapple", "pawpaw", "citrus", "fruit"] },
  { name: "Grains", words: ["ofada", "rice", "maize", "corn", "millet", "sorghum", "guinea corn", "cereal", "grain"] },
];

/**
 * Walks the rules in their own order rather than the order the categories arrive in, so precedence
 * is the list above and not whatever the database returned. Anything the rules do not recognise
 * falls back to the category naming itself, which keeps a future category working untouched.
 */
function matchCategory(lower: string, categories: { id: string; name: string }[]) {
  for (const rule of categoryKeywords) {
    if (!rule.words.some((word) => lower.includes(word))) continue;
    const found = categories.find((item) => item.name.toLowerCase() === rule.name.toLowerCase());
    if (found) return found;
  }
  return categories.find((item) => lower.includes(item.name.toLowerCase().replace(/s$/, ""))) || null;
}

export function listingFallback(notes: string, categories: { id: string; name: string }[]) {
  const clean = notes.trim().replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const category = matchCategory(lower, categories);
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
