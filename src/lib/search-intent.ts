const stopWords = new Set([
  "a", "an", "and", "for", "how", "i", "ingredient", "ingredients", "make", "making",
  "need", "of", "please", "recipe", "the", "to", "want", "with",
]);

const mealIngredients: Array<{ phrases: string[]; terms: string[] }> = [
  { phrases: ["fried rice"], terms: ["rice", "carrot", "egg", "peas", "sweet corn", "onion", "pepper", "chicken"] },
  { phrases: ["jollof rice", "jollof"], terms: ["rice", "tomato", "pepper", "onion", "chicken"] },
  { phrases: ["vegetable soup", "edikaikong", "efo riro"], terms: ["ugwu", "spinach", "pepper", "onion", "tomato"] },
  { phrases: ["egusi soup", "egusi"], terms: ["melon", "ugwu", "spinach", "pepper", "onion"] },
  { phrases: ["stew"], terms: ["tomato", "pepper", "onion", "chicken", "turkey"] },
  { phrases: ["salad"], terms: ["cucumber", "carrot", "lettuce", "tomato", "avocado"] },
  { phrases: ["breakfast"], terms: ["egg", "bread", "plantain", "yam", "potato", "fruit"] },
  { phrases: ["pepper soup"], terms: ["pepper", "chicken", "turkey", "fish"] },
];

function uniqueTerms(terms: string[]) {
  return [...new Set(terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1))].slice(0, 14);
}

export function searchIntentFallback(input: string) {
  const query = input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const matched = mealIngredients.find((intent) => intent.phrases.some((phrase) => query.includes(phrase)));
  const literalTerms = query.split(" ").filter((term) => !stopWords.has(term) && term.length > 1);
  return {
    terms: uniqueTerms([...(matched?.terms || []), ...literalTerms]),
    explanation: matched ? `Ingredients commonly used for ${matched.phrases[0]}` : "Related marketplace search terms",
  };
}

export function matchesSearchTerms(searchable: string, terms: string[]) {
  const value = searchable.toLowerCase();
  return terms.some((term) => value.includes(term.toLowerCase()));
}
