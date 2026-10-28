import type { PantryData, MembersData, Preferences, Plan, PlanStep } from "./types.js";
import { generateRequestId } from "./data.js";

export interface ParsedRequest {
  intent: "plan_dinner" | "unknown";
  guestCount?: number;
  budget?: number;
  cuisine?: string;
}

export function parseRequest(input: string): ParsedRequest {
  const lower = input.toLowerCase();

  if (lower.includes("dinner") || lower.includes("meal") || lower.includes("cook")) {
    let guestCount = 4;
    const guestMatch = lower.match(/(\d+)\s*(guest|people|person)/);
    if (guestMatch) {
      guestCount = parseInt(guestMatch[1], 10);
    }

    let budget = 50;
    const budgetMatch = lower.match(/(?:under\s*)?\$(\d+)|(\d+)\s*(?:dollar|budget)/);
    if (budgetMatch) {
      budget = parseInt(budgetMatch[1] || budgetMatch[2], 10);
    }

    let cuisine: string | undefined;
    if (lower.includes("italian")) cuisine = "italian";
    else if (lower.includes("mexican")) cuisine = "mexican";
    else if (lower.includes("american")) cuisine = "american";

    return { intent: "plan_dinner", guestCount, budget, cuisine };
  }

  return { intent: "unknown" };
}

const RECIPE_INGREDIENTS: Record<string, string[]> = {
  "chicken stir fry": ["chicken breast", "broccoli", "garlic", "onion", "olive oil", "rice"],
  "pasta with tomato sauce": ["pasta", "tomato", "garlic", "onion", "olive oil", "cheese"],
  "chicken and rice": ["chicken breast", "rice", "broccoli", "garlic", "onion", "olive oil"],
  "vegetable pasta": ["pasta", "tomato", "broccoli", "garlic", "onion", "olive oil", "cheese"],
  "scrambled eggs": ["eggs", "cheese", "olive oil"],
};

function selectRecipe(cuisine?: string): string {
  const recipes = Object.keys(RECIPE_INGREDIENTS);
  if (cuisine === "italian") return "pasta with tomato sauce";
  if (cuisine === "mexican") return "chicken stir fry";
  return recipes[0];
}

export function generatePlan(
  parsed: ParsedRequest,
  pantry: PantryData,
  members: MembersData,
  prefs: Preferences
): Plan {
  const requestId = generateRequestId();
  const steps: PlanStep[] = [];

  if (parsed.intent !== "plan_dinner") {
    return { steps: [], requestId };
  }

  const recipe = selectRecipe(parsed.cuisine);
  const requiredIngredients = RECIPE_INGREDIENTS[recipe] || [];

  const pantryNames = pantry.items.map((i) => i.name.toLowerCase());
  const available = requiredIngredients.filter((ing) => pantryNames.includes(ing.toLowerCase()));
  const missing = requiredIngredients.filter((ing) => !pantryNames.includes(ing.toLowerCase()));

  steps.push({
    tool: "check_pantry",
    input: { ingredients: requiredIngredients },
    description: `Check pantry for ${requiredIngredients.length} ingredients needed for ${recipe}`,
  });

  if (missing.length > 0) {
    const budget = parsed.budget ?? prefs.budget;
    steps.push({
      tool: "generate_shopping_list",
      input: { missing, budget },
      description: `Generate shopping list for ${missing.length} missing items within $${budget} budget`,
    });

    steps.push({
      tool: "assign_errand",
      input: { list: missing, members: members.members.map((m) => m.name) },
      description: `Assign shopping errand to a household member`,
    });
  }

  steps.push({
    tool: "create_reminder",
    input: {
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      title: `Dinner: ${recipe} for ${parsed.guestCount} guests`,
    },
    description: `Create reminder for dinner tomorrow`,
  });

  return { steps, requestId };
}