# HomeRelay — Hackathon Submission Materials

> **Project Name:** HomeRelay  
> **Track:** Alexa+ (Ambient Intelligence & Household Coordination)  
> **Repository:** `homerelay-alexa-plus`

---

## 1. Project Tagline / One-Liner
> An intelligent household coordination agent uniting Alexa voice interactions with deterministic planning, transparent user confirmation, and official Model Context Protocol (MCP) tooling.

---

## 2. Project Description (Short & Compelling)

Household management is one of the most persistent friction points in daily life. Families coordinate meals, grocery runs, pantry supplies, and errand delegation across fragmented apps, group chats, and sticky notes. Voice assistants have historically struggled with these workflows because users are hesitant to let AI autonomously spend budgets, purchase groceries, or create commitments without explicit guardrails.

**HomeRelay** solves this by introducing an auditable, human-in-the-loop coordination agent. Built for the Alexa+ ecosystem, HomeRelay allows any family member to speak naturally to Alexa or enter goals into a web dashboard (e.g., *"Plan a dinner for 4 guests under $50"*). Instead of executing unpredictable actions, HomeRelay's deterministic planner queries pantry inventory, verifies nutritional preferences, checks budget limits, and drafts a structured **Execution Plan**. The user reviews and approves the multi-step plan before any errand assignment, reminder, or shopping list is created. Every tool invocation adheres to the open **Model Context Protocol (MCP)** via Streamable HTTP, establishing a clean, standards-compliant foundation for ambient intelligence.

---

## 3. Key Differentiators & Innovation

1. **Human-in-the-Loop Transparency (Preview & Confirm):**  
   Autonomous agents often fail because of a lack of predictability. HomeRelay decouples *planning* from *execution*. It constructs a multi-step plan (checking pantry -> calculating missing items -> creating shopping lists -> delegating to household members -> scheduling reminders) and requires user confirmation before mutations take place.
2. **Official Model Context Protocol (MCP) Standard:**  
   Employs the `@modelcontextprotocol/sdk` (Streamable HTTP) over AWS API Gateway and Lambda. Tools (`check_pantry`, `generate_shopping_list`, `assign_errand`, `create_reminder`) can be consumed interchangeably by the Alexa skill, the web app, or future LLM agent orchestrators (such as Amazon Bedrock).
3. **Idempotency & Cryptographic Audit Trail:**  
   Every generated plan carries a unique request ID. The execution engine enforces idempotency so identical requests cannot accidentally double-order items or trigger duplicate reminders. All operations are written to an immutable structured JSON-Lines action log.
4. **Multi-Modal Experience:**  
   Seamlessly integrates voice-first ambient interaction through the Alexa Skills Kit (ASK) with a modern, glassmorphic React dashboard displaying live inventory status, active members, and errand history.

---

## 4. End-to-End Demo Walkthrough

### Step 1: Voice Pantry Check via Alexa
* **User:** *"Alexa, ask Home Relay what I have for chicken and rice."*
* **Home Relay:** *"Available: chicken breast, rice. Missing: none."*
* **Under the Hood:** Alexa Lambda invokes `check_pantry` on the MCP API Gateway endpoint (`/prod/mcp`), parsing slot values and returning structured ingredient status.

### Step 2: Goal Input on Web Dashboard
* **User Action:** Open the HomeRelay web dashboard. Enter *"Plan dinner for 4 guests under $50"* into the planning interface and submit.
* **Under the Hood:** Express backend parses the natural language request, matches recipe requirements against local pantry inventory, checks dietary preferences and budget constraints.

### Step 3: Interactive Plan Preview
* **User Action:** The dashboard displays the generated **Execution Plan**:
  * Step 1: `check_pantry` for recipe ingredients.
  * Step 2: `generate_shopping_list` for missing components (olive oil, seasoning) within budget.
  * Step 3: `assign_errand` to available household member (e.g., Alex).
  * Step 4: `create_reminder` for prep time.
* **User Action:** Review the step breakdown and click **Confirm & Execute**.

### Step 4: Execution & Audit
* **Under the Hood:** The execution engine runs each tool sequentially, records results, updates the persistent action log, and renders confirmation badges with zero latency.

---

## 5. Technology Stack Summary

* **Frontend:** React 18, TypeScript 5.7, Vite 5.4, Vanilla CSS Design System.
* **Backend:** Node.js 22, Express 4.21, TypeScript, Zod.
* **Voice & Serverless:** AWS Serverless Application Model (SAM), AWS Lambda (`nodejs22.x`), Amazon API Gateway HTTP API (Payload v2.0), Alexa Skills Kit (`ask-sdk-core`).
* **Agentic Protocol:** Model Context Protocol (MCP) v1.27.1 (`@modelcontextprotocol/sdk`).
* **Packaging & DevOps:** Docker (`node:22-alpine`), Cloudflare Tunnels, Vercel Edge.

---

## 6. Submission Field Reference & Checkpoints

| Submission Field | Content / Link | Status |
| :--- | :--- | :--- |
| **Project Title** | HomeRelay | Ready |
| **Track** | Alexa+ | Ready |
| **GitHub Repository** | Initialized locally on `main` branch (`homerelay-alexa-plus`) | Ready to push |
| **Working Live Demo (Web)** | `https://jacksonville-enlargement-historic-variations.trycloudflare.com` | Verified Live (HTTP 200) |
| **Edge Deployment (Web)** | `https://racing-squall-u0iio9k.tmp.now` | Verified Live (HTTP 200) |
| **Live Backend API** | `https://packet-header-eggs-investor.trycloudflare.com` | Verified Live (HTTP 200) |
| **Health Endpoint** | `https://packet-header-eggs-investor.trycloudflare.com/health` | Verified Live (HTTP 200) |
| **Alexa Skill Model** | `apps/alexa/interaction-model.json` & `apps/alexa/skill.json` | Validated & Ready |
| **SAM Template** | `template.yaml` | Validated with `sam validate --lint` |
| **Demo Video** | [Record 2-3 minute screen recording demonstrating the 4 steps above] | Manual Action |
