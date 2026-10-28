import type { PantryData, ShoppingList, ErrandAssignment, Reminder } from "./types.js";
import { getPantry, getPreferences, addShoppingList, addErrand, addReminder } from "./data.js";

export async function checkPantry(ingredients: string[]): Promise<{ available: string[]; missing: string[] }> {
  const pantry = await getPantry();
  const pantryNames = new Set(pantry.items.map((i) => i.name.toLowerCase()));
  const available = ingredients.filter((ing) => pantryNames.has(ing.toLowerCase()));
  const missing = ingredients.filter((ing) => !pantryNames.has(ing.toLowerCase()));
  return { available, missing };
}

const ITEM_COSTS: Record<string, number> = {
  "chicken breast": 8.99,
  rice: 2.5,
  broccoli: 3.99,
  "olive oil": 12.99,
  garlic: 1.5,
  onion: 1.99,
  tomato: 2.99,
  pasta: 2.49,
  cheese: 4.99,
  eggs: 4.5,
};

export async function generateShoppingList(
  missing: string[],
  budget: number
): Promise<ShoppingList> {
  const list = missing.map((item) => ({
    item,
    cost: ITEM_COSTS[item.toLowerCase()] || 5.0,
  }));

  const totalCost = list.reduce((sum, item) => sum + item.cost, 0);

  if (totalCost > budget) {
    throw new Error(`Shopping list total $${totalCost.toFixed(2)} exceeds budget of $${budget}`);
  }

  const result: ShoppingList = { list, totalCost };
  await addShoppingList(result);
  return result;
}

export async function assignErrand(
  list: string[],
  members: string[]
): Promise<ErrandAssignment> {
  if (members.length === 0) {
    throw new Error("No household members available for assignment");
  }
  const assignee = members[Math.floor(Math.random() * members.length)];
  const result: ErrandAssignment = {
    assignment: { member: assignee, items: list },
  };
  await addErrand(result);
  return result;
}

export async function createReminder(
  date: string,
  title: string
): Promise<Reminder> {
  const reminderId = `rem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const result: Reminder = { reminderId };
  await addReminder(result);
  return result;
}