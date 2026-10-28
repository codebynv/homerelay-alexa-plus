import express from "express";
import cors from "cors";

import { getPantry, getMembers, getPreferences, getActionLog, appendActionLog } from "./data.js";
import { parseRequest, generatePlan } from "./planner.js";
import { checkPantry, generateShoppingList, assignErrand, createReminder, } from "./tools.js";
import type { Plan, ExecuteRequest, ActionLogEntry } from "./types.js";

const app = express();
const defaultOrigins = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://racing-squall-u0iio9k.tmp.now",
  "https://jacksonville-enlargement-historic-variations.trycloudflare.com",
];
const corsOrigin =
  process.env.CORS_ORIGIN === "*"
    ? "*"
    : process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : defaultOrigins;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.get("/api/pantry", async (_req, res) => {
  try {
    const pantry = await getPantry();
    res.json(pantry);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pantry" });
  }
});

app.get("/api/members", async (_req, res) => {
  try {
    const members = await getMembers();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

app.get("/api/preferences", async (_req, res) => {
  try {
    const prefs = await getPreferences();
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

app.get("/api/log", async (_req, res) => {
  try {
    const log = await getActionLog();
    res.json({ entries: log });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch action log" });
  }
});

app.post("/api/plan", async (req, res) => {
  try {
    const { request } = req.body as { request?: string };
    if (!request || typeof request !== "string") {
      return res.status(400).json({ error: "Invalid input", details: "Missing 'request' string" });
    }

    const parsed = parseRequest(request);
    if (parsed.intent === "unknown") {
      return res.status(422).json({ error: "Could not understand request", details: "Try asking to plan dinner" });
    }

    const [pantry, members, prefs] = await Promise.all([
      getPantry(),
      getMembers(),
      getPreferences(),
    ]);

    const plan = generatePlan(parsed, pantry, members, prefs);
    res.json({ plan });
  } catch (err) {
    console.error("Plan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/execute", async (req, res) => {
  try {
    const { plan, requestId } = req.body as ExecuteRequest;
    if (!plan || !plan.steps || !requestId) {
      return res.status(400).json({ error: "Invalid input", details: "Missing plan or requestId" });
    }

    const results: Array<{ tool: string; result: unknown; status: "success" | "error" }> = [];

    for (const step of plan.steps) {
      let result: unknown;
      let status: "success" | "error" = "success";

      try {
        switch (step.tool) {
          case "check_pantry": {
            const input = step.input as { ingredients: string[] };
            result = await checkPantry(input.ingredients);
            break;
          }
          case "generate_shopping_list": {
            const input = step.input as { missing: string[]; budget: number };
            result = await generateShoppingList(input.missing, input.budget);
            break;
          }
          case "assign_errand": {
            const input = step.input as { list: string[]; members: string[] };
            result = await assignErrand(input.list, input.members);
            break;
          }
          case "create_reminder": {
            const input = step.input as { date: string; title: string };
            result = await createReminder(input.date, input.title);
            break;
          }
          default:
            throw new Error(`Unknown tool: ${step.tool}`);
        }
      } catch (err) {
        status = "error";
        result = { error: err instanceof Error ? err.message : "Unknown error" };
      }

      results.push({ tool: step.tool, result, status });

      const logEntry: ActionLogEntry = {
        timestamp: new Date().toISOString(),
        tool: step.tool,
        input: step.input,
        result,
        status,
        requestId,
      };
      await appendActionLog(logEntry);
    }

    res.json({ results });
  } catch (err) {
    console.error("Execute error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;