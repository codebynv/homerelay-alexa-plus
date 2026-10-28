# HomeRelay – Alexa+ Architecture Overview

## High‑Level Diagram (textual)
```
[User (Web UI)] <--REST/WS--> [Frontend (React+TS+Vite)] <--HTTP--> [Backend (Node.js/Express)] <--Streamable HTTP--> [MCP Server (official SDK)]
                                 |                                      |
                                 |--- reads seeded JSON data ---------- |
                                 |--- writes audit log (local file) ----|
```

## Components
| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | React + TypeScript + Vite | UI input, preview modal, action‑log view, responsive design. |
| **Planner Service** | Node.js (Express) | Parse natural‑language request, select MCP tools, generate provisional action plan. |
| **MCP Server** | Node.js (official MCP SDK) | Implements *Streamable HTTP* endpoints for each tool (e.g., `CheckPantry`, `GenerateShoppingList`, `AssignErrand`, `CreateReminder`). |
| **Data Store** | JSON files (in `data/` folder) | Seeded pantry inventory, household preferences, budget limits, user profiles (all labelled *Simulated Demo Data*). |
| **Action Log** | Simple file (`logs/action.log`) | Chronological record of tool invocations, inputs, outputs, timestamps – displayed in the UI. |
| **Test Harness** | Playwright / Jest | Unit tests for planner logic; end‑to‑end flow test covering UI → backend → MCP → log. |

## Data Flow (request → execution)
1. **User enters request** in the UI. 
2. UI sends request to **Planner Service** via `POST /plan`. 
3. Planner parses request (basic NLP / rule‑based) and selects a sequence of MCP tools. 
4. Planner returns a *plan* JSON to the UI. 
5. UI shows a **Confirmation Modal** listing each step. 
6. On *Accept*, UI POSTs the plan to `POST /execute`. 
7. Backend iterates through the plan, invoking the **MCP Server** over **Streamable HTTP** for each tool, passing the relevant seeded data. 
8. Each tool returns a success payload; the backend logs the call (input, output, timestamp). 
9. After all steps, backend returns an aggregated result; UI updates the **Action Log** view. 

## MCP Tool Definitions (sample JSON manifest)
```json
[
  {
    "name": "CheckPantry",
    "description": "Returns items available for a given ingredient list.",
    "inputSchema": {"ingredients": ["string"]},
    "outputSchema": {"available": ["string"], "missing": ["string"]}
  },
  {
    "name": "GenerateShoppingList",
    "description": "Creates a shopping list based on missing ingredients and budget.",
    "inputSchema": {"missing": ["string"], "budget": "number"},
    "outputSchema": {"list": [{"item":"string","cost":"number"}]}
  },
  {
    "name": "AssignErrand",
    "description": "Assigns a household member to purchase items.",
    "inputSchema": {"list": [{"item":"string"}], "members": ["string"]},
    "outputSchema": {"assignment": {"member":"string","items":["string"]}}
  },
  {
    "name": "CreateReminder",
    "description": "Creates a calendar reminder for the dinner event.",
    "inputSchema": {"date":"string","title":"string"},
    "outputSchema": {"reminderId":"string"}
  }
]
```
*The actual manifest will be stored at `mcp/manifest.json`.

## Testing Strategy
- **Unit tests** (`tests/planner.test.ts`) for each parsing rule and plan generation path.
- **MCP mock server** tests to verify proper request/response shapes.
- **End‑to‑end test** (`e2e/homeRelay.spec.ts`) using Playwright:
  1. Load UI, type a sample request.
  2. Verify the preview modal shows expected actions.
  3. Accept and assert that the action log shows four entries with correct data.
- CI pipeline will run `npm test` and `npm run build` to ensure reproducibility.

## Optional Mini‑Challenges (separate from core MVP)
- **AWS Builder:** Deploy the MCP server to an EC2 instance via Cloud9 and expose it over HTTPS.
- **Open‑Source:** Publish the MCP tool definitions as an npm package (`home-relay-mcp-tools`).

---
*All components are built on locally‑seeded data; no external Amazon services or credentials are required.*
