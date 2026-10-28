# HomeRelay – Alexa+ Demo (Project Brief)

## Context & Problem
Household coordination (pantry inventory, shopping lists, errands, assignments, and reminders) is scattered across many apps. We need a single conversational interface that can turn a natural‑language request into a deterministic multi‑step workflow, let the user preview and confirm the actions, and then execute them in a transparent, auditable way.

## Primary Track
- **Track:** Alexa+ (simulated web experience with a real MCP server over **Streamable HTTP**).
- **Protocol version:** `2025-11-25` – verified against the official MCP SDK documentation (compatible with the SDK version shipped with the hackathon resources).

## Technical Stack (simplified for maintainability)
- **Frontend:** React + TypeScript + Vite (no additional UI frameworks).
- **Backend:** Node.js + TypeScript.
- **MCP SDK:** Official Amazon MCP SDK (JavaScript/TypeScript) used in *Streamable HTTP* mode.

## Planner
A deterministic, rule‑based parser that recognises a small, documented set of demo requests (e.g., *"plan dinner for 4 guests under $50"*). No LLM or probabilistic models are involved.

## Minimum Viable Feature Set (MVP)
| Feature | Implementation |
|---------|----------------|
| Conversational UI | Single input component mimicking Alexa voice interaction. |
| Planner Engine | Deterministic rule‑based parser producing a **preview plan**. |
| MCP Integration | Real Streamable HTTP MCP server exposing four tools (see below). |
| Seeded Data Store | Local JSON files (`data/pantry.json`, `data/preferences.json`, `data/members.json`). |
| Confirmation Modal | Shows the planned actions; user must *Accept* to run any state‑changing tool. |
| Action Log | Structured JSON‑Lines log (`logs/action.log`) with timestamp, tool name, sanitized input, result, and status. |
| Automated Tests | One test stack (Jest + Playwright) covering planning, cancellation, confirmation, MCP communication, validation errors, and log entries. |

## MCP Tool Definitions (official schema syntax)
```json
[
  {
    "name": "check_pantry",
    "description": "Return which requested ingredients are available in the pantry.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "ingredients": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["ingredients"],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "available": {"type": "array", "items": {"type": "string"}},
        "missing": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["available", "missing"],
      "additionalProperties": false
    }
  },
  {
    "name": "generate_shopping_list",
    "description": "Create a shopping list for missing items while respecting a budget.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "missing": {"type": "array", "items": {"type": "string"}},
        "budget": {"type": "number"}
      },
      "required": ["missing", "budget"],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "list": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {"item": {"type": "string"}, "cost": {"type": "number"}},
            "required": ["item", "cost"],
            "additionalProperties": false
          }
        },
        "totalCost": {"type": "number"}
      },
      "required": ["list", "totalCost"],
      "additionalProperties": false
    }
  },
  {
    "name": "assign_errand",
    "description": "Assign a household member to perform the shopping errand.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "list": {
          "type": "array",
          "items": {"type": "string"}
        },
        "members": {
          "type": "array",
          "items": {"type": "string"}
        }
      },
      "required": ["list", "members"],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "assignment": {
          "type": "object",
          "properties": {"member": {"type": "string"}, "items": {"type": "array", "items": {"type": "string"}}},
          "required": ["member", "items"],
          "additionalProperties": false
        }
      },
      "required": ["assignment"],
      "additionalProperties": false
    }
  },
  {
    "name": "create_reminder",
    "description": "Create a simulated calendar reminder for the dinner event.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "date": {"type": "string", "format": "date-time"},
        "title": {"type": "string"}
      },
      "required": ["date", "title"],
      "additionalProperties": false
    },
    "outputSchema": {
      "type": "object",
      "properties": {"reminderId": {"type": "string"}},
      "required": ["reminderId"],
      "additionalProperties": false
    }
  }
]
```
**Error handling** for each tool:
- **Invalid input** → return `400` with a JSON error object `{ "error": "Invalid input", "details": … }`.
- **Internal error / unavailable MCP** → return `503` with `{ "error": "Service unavailable" }`.
- **Business rule violation** (e.g., budget exceeded) → return `422` with a descriptive message.

## Execution Safety
1. Planner always returns a **preview plan**; no tool is invoked at this stage.
2. The UI shows the preview in a modal. The user must *Accept* to trigger execution; *Cancel* discards the plan with **no state change**.
3. Execution is idempotent where possible – repeated identical requests produce the same log entries without duplicating state (the backend tracks a request UUID). 

## Data Layer
- All demo data lives in `data/` as JSON files.
- Reminders and errand assignments are written to `data/records.json` (simulated storage).
- UI displays a persistent **“Simulated Demo Data”** badge on every data‑driven component.

## Action Log Format
Each line in `logs/action.log` is a JSON object:
```json
{ "timestamp": "2026-10-23T21:55:00Z", "tool": "check_pantry", "input": {"ingredients": ["tomato"]}, "result": {"available": [], "missing": ["tomato"]}, "status": "success" }
```
Secrets are never included; only sanitized user‑provided data.

## Testing Strategy (single stack)
- **Unit tests** (Jest) for each planner rule and for schema validation of MCP inputs/outputs.
- **MCP mock server tests** using the official SDK’s in‑process mock to verify request/response contracts.
- **End‑to‑end test** (Playwright):
  1. Load the UI, type a supported demo request.
  2. Verify the preview modal lists the four expected actions.
  3. Click *Cancel* → assert that `logs/action.log` is unchanged.
  4. Click *Accept* → assert that four log entries appear with `status: "success"` and that the simulated `records.json` contains the reminder and assignment.
- No coverage percentage is claimed; tests will be added until the above scenarios pass.

## Security & Error Handling
- All incoming JSON is validated against the MCP tool schemas before any server‑side logic runs.
- The MCP server runs locally; no external credentials or AWS keys are required.
- Unexpected errors are caught and returned as `500` with a generic message; stack traces are never exposed to the UI.

## Scope & Exclusions
- **AWS deployment** (Cloud9, EC2, etc.) is omitted from the core plan. It may be explored later if time permits and will be documented separately.
- **Open‑source package publishing** is also excluded from the MVP.

## Submission Checklist (to be completed after implementation)
- [ ] Repository license (MIT) ✔
- [ ] Clear `README.md` with setup, build, and run instructions.
- [ ] Screenshots of UI (input, preview, action log) ✔
- [ ] Public demo video ≤ 3 min showing a full request‑to‑execution flow.
- [ ] Devpost entry with links to repo, video, and live demo URL.
- [ ] Honest product‑feedback / friction‑log documenting any usability issues discovered during testing.

---
*All decisions above follow the constraints: no extraction of the existing ZIP archives, no package installation, and no creation of external secrets. The plan is ready for implementation pending any genuine blocker you may identify.*
