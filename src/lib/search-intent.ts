const stopWords = new Set([
  "a", "an", "and", "for", "how", "i", "ingredient", "ingredients", "make", "making",
  "need", "of", "please", "recipe", "the", "to", "want", "with",
]);

const mealIngredients: Array<{ phrases: string[]; terms: string[]; context?: "nutrition" }> = [
  { phrases: ["vitamin c", "vitamin-c"], terms: ["orange", "pineapple", "tomato", "pepper", "fruit"], context: "nutrition" },
  { phrases: ["vitamin a", "vitamin-a"], terms: ["carrot", "spinach", "ugwu", "sweet potato", "egg"], context: "nutrition" },
  { phrases: ["vitamin e", "vitamin-e"], terms: ["avocado", "spinach", "ugwu", "egg"], context: "nutrition" },
  { phrases: ["iron rich", "iron-rich", "iron"], terms: ["spinach", "ugwu", "beans", "egg"], context: "nutrition" },
  { phrases: ["high protein", "protein rich", "protein"], terms: ["egg", "beans", "chicken", "turkey"], context: "nutrition" },
  { phrases: ["carbohydrates", "carbohydrate", "carbonhydrates", "carbs"], terms: ["rice", "yam", "cassava", "plantain", "corn", "beans", "tuber", "grain"], context: "nutrition" },
  { phrases: ["potassium"], terms: ["plantain", "yam", "cassava", "sweet potato", "spinach", "ugwu", "okra", "avocado", "tomato", "orange"], context: "nutrition" },
  { phrases: ["low sodium", "sodium"], terms: ["spinach", "ugwu", "carrot", "cucumber", "tomato", "avocado", "fruit", "vegetable"], context: "nutrition" },
  { phrases: ["calcium"], terms: ["spinach", "ugwu", "egg", "beans", "orange"], context: "nutrition" },
  { phrases: ["magnesium"], terms: ["spinach", "ugwu", "beans", "avocado", "plantain"], context: "nutrition" },
  { phrases: ["fibre", "fiber"], terms: ["beans", "okra", "avocado", "carrot", "fruit", "vegetable", "grain"], context: "nutrition" },
  { phrases: ["folate", "folic acid"], terms: ["spinach", "ugwu", "beans", "avocado", "orange"], context: "nutrition" },
  { phrases: ["zinc"], terms: ["egg", "beans", "chicken", "turkey"], context: "nutrition" },
  { phrases: ["antioxidant", "antioxidants"], terms: ["tomato", "pepper", "carrot", "orange", "spinach", "ugwu"], context: "nutrition" },
  { phrases: ["fried rice"], terms: ["rice", "carrot", "egg", "peas", "sweet corn", "onion", "pepper", "chicken"] },
  { phrases: ["jollof rice", "jollof"], terms: ["rice", "tomato", "pepper", "onion", "chicken"] },
  { phrases: ["vegetable soup", "edikaikong", "efo riro"], terms: ["ugwu", "spinach", "pepper", "onion", "tomato"] },
  { phrases: ["egusi soup", "egusi"], terms: ["melon", "ugwu", "spinach", "pepper", "onion"] },
  { phrases: ["stew"], terms: ["tomato", "pepper", "onion", "chicken", "turkey"] },
  { phrases: ["salad"], terms: ["cucumber", "carrot", "lettuce", "tomato", "avocado"] },
  { phrases: ["breakfast"], terms: ["egg", "bread", "plantain", "yam", "potato", "fruit"] },
  { phrases: ["pepper soup"], terms: ["pepper", "chicken", "turkey", "fish"] },
];

const produceSynonyms = [
  ["rice", "oryza", "oryza sativa", "oriza", "oriza sativa"],
  ["chicken", "chick", "chicks", "poultry"],
  ["pepper", "scotch bonnet"],
  ["maize", "corn"],
  ["ugwu", "spinach", "leafy vegetable", "leafy vegetables"],
  ["cassava", "garri"],
  ["beans", "legume", "legumes"],
  ["plantain", "banana"],
  ["yam", "tuber", "tubers"],
] as const;

function uniqueTerms(terms: string[]) {
  return [...new Set(terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1))].slice(0, 14);
}

export function searchIntentFallback(input: string) {
  const query = input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const matched = mealIngredients.find((intent) => intent.phrases.some((phrase) => query.includes(phrase)));
  const literalTerms = query.split(" ").filter((term) => !stopWords.has(term) && term.length > 1);
  const synonymTerms = produceSynonyms.filter((group) => group.some((term) => query.includes(term))).flat();
  return {
    terms: uniqueTerms([...(matched?.terms || []), ...synonymTerms, ...literalTerms]),
    explanation: matched
      ? matched.context === "nutrition"
        ? `Produce commonly associated with ${matched.phrases[0]}`
        : `Ingredients commonly used for ${matched.phrases[0]}`
      : "Related marketplace search terms",
  };
}

export function matchesSearchTerms(searchable: string, terms: string[]) {
  const value = searchable.toLowerCase();
  return terms.some((term) => value.includes(term.toLowerCase()));
}
