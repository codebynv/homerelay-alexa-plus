import { z } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  checkPantry,
  generateShoppingList,
  assignErrand,
  createReminder,
} from "./tools.js";
import { appendActionLog, generateRequestId } from "./data.js";
import type { ActionLogEntry } from "./types.js";

export const checkPantryInputSchema = z.object({
  ingredients: z.array(z.string()).describe("List of ingredient names to check in the pantry"),
});

export const checkPantryOutputSchema = z.object({
  available: z.array(z.string()).describe("Ingredients that are available in the pantry"),
  missing: z.array(z.string()).describe("Ingredients that are missing from the pantry"),
});

export const generateShoppingListInputSchema = z.object({
  missing: z.array(z.string()).describe("List of missing ingredient names"),
  budget: z.number().positive().describe("Maximum budget in dollars for the shopping list"),
});

export const generateShoppingListOutputSchema = z.object({
  list: z.array(
    z.object({
      item: z.string(),
      cost: z.number(),
    })
  ).describe("Shopping list items with their estimated costs"),
  totalCost: z.number().describe("Total cost of all items in the shopping list"),
});

export const assignErrandInputSchema = z.object({
  list: z.array(z.string()).describe("List of item names to purchase"),
  members: z.array(z.string()).describe("List of household member names who can be assigned"),
});

export const assignErrandOutputSchema = z.object({
  assignment: z.object({
    member: z.string().describe("Name of the assigned household member"),
    items: z.array(z.string()).describe("Items assigned to the member"),
  }),
});

export const createReminderInputSchema = z.object({
  date: z.string().datetime().describe("ISO 8601 date-time for the reminder"),
  title: z.string().describe("Title/description of the reminder"),
});

export const createReminderOutputSchema = z.object({
  reminderId: z.string().describe("Unique identifier for the created reminder"),
});

async function logAction(
  tool: string,
  input: unknown,
  result: unknown,
  status: "success" | "error",
  requestId?: string | number
): Promise<void> {
  const entry: ActionLogEntry = {
    timestamp: new Date().toISOString(),
    tool,
    input,
    result,
    status,
    requestId: requestId ? String(requestId) : undefined,
  };
  await appendActionLog(entry);
}

function createTextContent(text: string): CallToolResult["content"][0] {
  return { type: "text", text } as const;
}

function toRecord(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>;
}

export const mcpTools = [
  {
    name: "check_pantry",
    description: "Return which requested ingredients are available in the pantry.",
    inputSchema: checkPantryInputSchema,
    outputSchema: checkPantryOutputSchema,
    handler: async (args: z.infer<typeof checkPantryInputSchema>, extra: RequestHandlerExtra<any, any>): Promise<CallToolResult> => {
      const requestId = extra.requestId || generateRequestId();
      try {
        const result = await checkPantry(args.ingredients);
        await logAction("check_pantry", args, result, "success", requestId);
        return {
          content: [createTextContent("Pantry check complete. Available: " + (result.available.join(", ") || "none") + ". Missing: " + (result.missing.join(", ") || "none"))],
          structuredContent: toRecord(result),
        };
      } catch (error) {
        const errorResult = { error: error instanceof Error ? error.message : "Unknown error" };
        await logAction("check_pantry", args, errorResult, "error", requestId);
        throw error;
      }
    },
  },
  {
    name: "generate_shopping_list",
    description: "Create a shopping list for missing items while respecting a budget.",
    inputSchema: generateShoppingListInputSchema,
    outputSchema: generateShoppingListOutputSchema,
    handler: async (args: z.infer<typeof generateShoppingListInputSchema>, extra: RequestHandlerExtra<any, any>): Promise<CallToolResult> => {
      const requestId = extra.requestId || generateRequestId();
      try {
        const result = await generateShoppingList(args.missing, args.budget);
        await logAction("generate_shopping_list", args, result, "success", requestId);
        return {
          content: [createTextContent("Shopping list generated with " + result.list.length + " items. Total cost: $" + result.totalCost.toFixed(2))],
          structuredContent: toRecord(result),
        };
      } catch (error) {
        const errorResult = { error: error instanceof Error ? error.message : "Unknown error" };
        await logAction("generate_shopping_list", args, errorResult, "error", requestId);
        throw error;
      }
    },
  },
  {
    name: "assign_errand",
    description: "Assign a household member to perform the shopping errand.",
    inputSchema: assignErrandInputSchema,
    outputSchema: assignErrandOutputSchema,
    handler: async (args: z.infer<typeof assignErrandInputSchema>, extra: RequestHandlerExtra<any, any>): Promise<CallToolResult> => {
      const requestId = extra.requestId || generateRequestId();
      try {
        const result = await assignErrand(args.list, args.members);
        await logAction("assign_errand", args, result, "success", requestId);
        return {
          content: [createTextContent("Errand assigned to " + result.assignment.member + " for items: " + result.assignment.items.join(", "))],
          structuredContent: toRecord(result),
        };
      } catch (error) {
        const errorResult = { error: error instanceof Error ? error.message : "Unknown error" };
        await logAction("assign_errand", args, errorResult, "error", requestId);
        throw error;
      }
    },
  },
  {
    name: "create_reminder",
    description: "Create a simulated calendar reminder for the dinner event.",
    inputSchema: createReminderInputSchema,
    outputSchema: createReminderOutputSchema,
    handler: async (args: z.infer<typeof createReminderInputSchema>, extra: RequestHandlerExtra<any, any>): Promise<CallToolResult> => {
      const requestId = extra.requestId || generateRequestId();
      try {
        const result = await createReminder(args.date, args.title);
        await logAction("create_reminder", args, result, "success", requestId);
        return {
          content: [createTextContent("Reminder created: " + args.title + " at " + args.date + " (ID: " + result.reminderId + ")")],
          structuredContent: toRecord(result),
        };
      } catch (error) {
        const errorResult = { error: error instanceof Error ? error.message : "Unknown error" };
        await logAction("create_reminder", args, errorResult, "error", requestId);
        throw error;
      }
    },
  },
] as const;
