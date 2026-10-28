import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import type {
  PantryData,
  MembersData,
  Preferences,
  ShoppingList,
  ErrandAssignment,
  Reminder,
  ActionLogEntry,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const LOGS_DIR = path.join(__dirname, "..", "logs");

const DEFAULT_PANTRY: PantryData = {
  items: [
    { name: "chicken breast", quantity: 2, unit: "lbs" },
    { name: "rice", quantity: 3, unit: "cups" },
    { name: "broccoli", quantity: 2, unit: "heads" },
    { name: "olive oil", quantity: 1, unit: "bottle" },
    { name: "garlic", quantity: 5, unit: "cloves" },
    { name: "onion", quantity: 3, unit: "pieces" },
    { name: "tomato", quantity: 4, unit: "pieces" },
    { name: "pasta", quantity: 2, unit: "boxes" },
    { name: "cheese", quantity: 1, unit: "block" },
    { name: "eggs", quantity: 12, unit: "pieces" },
  ],
};

const DEFAULT_MEMBERS: MembersData = {
  members: [
    { id: "1", name: "Alice", role: "Cook" },
    { id: "2", name: "Bob", role: "Shopper" },
    { id: "3", name: "Charlie", role: "Helper" },
  ],
};

async function readJson<T>(fileName: string, defaultValue: T): Promise<T> {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

async function writeJson<T>(fileName: string, data: T): Promise<void> {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[data] Note: Could not persist ${fileName} to disk (ephemeral/read-only environment):`, err instanceof Error ? err.message : String(err));
  }
}

export async function getPantry(): Promise<PantryData> {
  return readJson<PantryData>("pantry.json", DEFAULT_PANTRY);
}

export async function getMembers(): Promise<MembersData> {
  return readJson<MembersData>("members.json", DEFAULT_MEMBERS);
}

export async function getPreferences(): Promise<Preferences> {
  return readJson<Preferences>("preferences.json", {
    budget: 50,
    dietaryRestrictions: [],
    preferredCuisines: [],
  });
}

interface RecordsData {
  shoppingLists: ShoppingList[];
  errands: ErrandAssignment[];
  reminders: Reminder[];
}

async function getRecords(): Promise<RecordsData> {
  return readJson<RecordsData>("records.json", {
    shoppingLists: [],
    errands: [],
    reminders: [],
  });
}

async function saveRecords(records: RecordsData): Promise<void> {
  await writeJson("records.json", records);
}

export async function addShoppingList(list: ShoppingList): Promise<void> {
  const records = await getRecords();
  records.shoppingLists.push(list);
  await saveRecords(records);
}

export async function addErrand(errand: ErrandAssignment): Promise<void> {
  const records = await getRecords();
  records.errands.push(errand);
  await saveRecords(records);
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const records = await getRecords();
  records.reminders.push(reminder);
  await saveRecords(records);
}

export async function getActionLog(): Promise<ActionLogEntry[]> {
  const logPath = path.join(LOGS_DIR, "action.log");
  try {
    const content = await fs.readFile(logPath, "utf-8");
    if (!content.trim()) return [];
    return content
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as ActionLogEntry);
  } catch {
    return [];
  }
}

export async function appendActionLog(entry: ActionLogEntry): Promise<void> {
  try {
    const logPath = path.join(LOGS_DIR, "action.log");
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(logPath, line, "utf-8");
  } catch {
    // In read-only environments (e.g. AWS Lambda) or when logs dir is missing, output structured log
    console.log(`[action-log] ${JSON.stringify(entry)}`);
  }
}

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateReminderId(): string {
  return `rem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}