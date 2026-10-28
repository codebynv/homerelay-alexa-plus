# HomeRelay — Alexa+ Household Coordination Agent

> **Amazon Developer Hackathon — Alexa+ Track Submission**  
> An intelligent, auditable household coordination agent that bridges Alexa conversational interfaces with deterministic planning and the Model Context Protocol (MCP).

---

## 🌐 Live Demonstrations

> **Note on Tunnel Availability:** The Cloudflare Quick Tunnel links below are host-backed demonstration URLs maintained while the local background daemons are running.

* **Primary Web Dashboard (Host-Backed Tunnel):**  
  [`https://jacksonville-enlargement-historic-variations.trycloudflare.com`](https://jacksonville-enlargement-historic-variations.trycloudflare.com)
* **Edge Web Dashboard (Vercel Deployment):**  
  [`https://racing-squall-u0iio9k.tmp.now`](https://racing-squall-u0iio9k.tmp.now)  
  *(Claimable to any personal Vercel team via [Vercel Claim Link](https://vercel.com/claim-deployment?code=04fb16dd-934e-4929-88ea-98f214ea64b0))*
* **Backend REST API (Host-Backed Tunnel):**  
  [`https://packet-header-eggs-investor.trycloudflare.com`](https://packet-header-eggs-investor.trycloudflare.com)
  * Health Endpoint: [`https://packet-header-eggs-investor.trycloudflare.com/health`](https://packet-header-eggs-investor.trycloudflare.com/health)
  * Pantry Inventory: [`https://packet-header-eggs-investor.trycloudflare.com/api/pantry`](https://packet-header-eggs-investor.trycloudflare.com/api/pantry)
  * Household Members: [`https://packet-header-eggs-investor.trycloudflare.com/api/members`](https://packet-header-eggs-investor.trycloudflare.com/api/members)

---

## 📌 Executive Summary

### The Problem
Household coordination today is deeply fragmented. Families juggle pantry inventories in notes apps, grocery lists on paper, errands over messaging channels, and dinner reminders in calendars. Traditional voice assistants answer simple questions but struggle to orchestrate multi-step real-world workflows without losing user trust or risking unintended automated actions.

### The Solution: HomeRelay
**HomeRelay** unites voice-driven ambient intelligence with auditable, deterministic workflow orchestration:
1. **Conversational Ingestion:** Users speak naturally via Alexa (e.g., *"Alexa, ask Home Relay to check the pantry for chicken and rice"*) or input goals through the responsive web app (*"Plan dinner for 4 guests under $50"*).
2. **Deterministic Planner:** Rather than hallucinating or executing unpredictably, HomeRelay uses a rule-based parser that inspects seeded pantry items, evaluates recipe requirements, and checks household member schedules and budgets.
3. **Transparent Review & Confirmation:** Generates an explicit **Execution Plan** for user confirmation before state mutations occur (preventing accidental purchases or unwanted reminders).
4. **Standardized Protocol (MCP):** Exposes tools via an official **Model Context Protocol (MCP)** Streamable HTTP endpoint (`/mcp`), ready for Amazon Bedrock and Alexa+ agentic reasoning.
5. **Auditable Action Log:** Every executed step is logged to an immutable JSON-Lines audit trail with cryptographic-safe request IDs preventing duplicate execution.

---

## 🏗️ Architecture & Component Topology

```
                   ┌──────────────────────────────────────────────┐
                   │             USER INTERFACES                  │
                   └──────────────────────┬───────────────────────┘
                                          │
            ┌─────────────────────────────┴──────────────────────────────┐
            ▼                                                            ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│  Alexa Skill (Voice / ASK)   │                         │  React SPA Web Dashboard     │
│  • apps/alexa (nodejs22.x)   │                         │  • apps/web (Vite + React)   │
│  • Custom Interaction Model  │                         │  • Live Pantry Inventory     │
│  • ASK SDK Core 2.14.0       │                         │  • Interactive Plan Preview  │
└──────────────┬───────────────┘                         └──────────────┬───────────────┘
               │                                                        │
               │ (Streamable HTTP / JSON-RPC)                           │ (REST / JSON)
               ▼                                                        ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│   MCP Server (AWS Lambda)    │                         │  Express REST Server (App)   │
│  • apps/server/src/mcp-lambda│                         │  • apps/server/src/server.ts │
│  • API Gateway HTTP API v2   │                         │  • Deterministic Planner     │
│  • StreamableHTTPTransport   │                         │  • Tool Orchestration        │
│  • Tools: check_pantry, etc. │                         │  • Auditable Action Logging  │
└──────────────────────────────┘                         └──────────────────────────────┘
```

### Components Deployed by SAM vs. Hosted
* **SAM Stack (`template.yaml`):** Deploys `AlexaFunction` (Lambda), `McpFunction` (Lambda), `McpApi` (API Gateway HTTP API v2.0), and `McpApiPermission`.
* **Express Backend & Web Dashboard:** Containerized with `Dockerfile` or run directly on Node.js 22, deployable to App Runner, ECS, Render, or Railway.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Voice & Alexa** | Alexa Skills Kit (`ask-sdk-core` v2.14.0), ASK Interaction Model v1.0, Node.js 22 Lambda |
| **Agent Protocol** | Anthropic / Model Context Protocol (MCP) Official SDK (`@modelcontextprotocol/sdk` v1.27.1), Streamable HTTP Transport |
| **Backend & API** | Node.js 22, Express 4.21, TypeScript 5.7, CORS, Zod 3.24 |
| **Frontend UI** | React 18.3, TypeScript, Vite 5.4, CSS3 Glassmorphism UI |
| **Cloud & DevOps** | AWS SAM (Serverless Application Model), CloudFormation, Docker (`node:22-alpine`), Cloudflare Tunnels, Vercel |

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* Node.js 22+ (verified with Node.js v24.19.0 / v22.x)
* npm 10+
* AWS SAM CLI (for serverless packaging)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/homerelay-alexa-plus.git
cd homerelay-alexa-plus

# Install all monorepo workspace dependencies
npm install
```

### Running Locally
```bash
# Terminal 1: Start Express Backend (Port 4000)
npm run dev:server

# Terminal 2: Start React Frontend (Port 3000)
npm run dev:web

# Terminal 3 (Optional): Start Local MCP Server (Port 4001)
npm run dev:mcp
```

* Frontend: `http://127.0.0.1:3000`
* Backend Health: `http://127.0.0.1:4000/health`
* REST API: `http://127.0.0.1:4000/api/*`

---

## 🧪 Automated Testing & Validation

The project includes an end-to-end automated pre-deployment validation pipeline:

```bash
# Run complete test suite and verification pipeline
npm run prepare:deploy
```

### Individual Validation Commands
```bash
# Unit Tests
npm --workspace apps/alexa run test
npm --workspace apps/server run test

# Typechecking
npm --workspace apps/alexa run typecheck
npm --workspace apps/server run typecheck
npx tsc --noEmit -p apps/web/tsconfig.json

# Lambda Workspace Packaging
node scripts/package-workspace.js apps/server
node scripts/package-workspace.js apps/alexa

# SAM Template Validation
sam validate -t template.yaml --lint
```

---

## ⚙️ Environment Variables

Copy `.env.example` to configure your environments:

```bash
# apps/web (Frontend build time)
VITE_API_BASE=https://your-backend.example.com

# apps/server (Backend runtime)
PORT=4000
HOST=0.0.0.0
CORS_ORIGIN=https://your-frontend.example.com

# apps/alexa (Lambda runtime, auto-configured in template.yaml)
MCP_URL=https://{McpApi}.execute-api.{Region}.amazonaws.com/prod/mcp
```

---

## ☁️ Cloud & AWS Deployment

### 1. SAM Deployment (Alexa Skill + MCP Lambda)
```bash
# Package Lambdas
node scripts/package-workspace.js apps/server
node scripts/package-workspace.js apps/alexa

# Build and deploy SAM stack
sam build
sam deploy --guided --stack-name homerelay-stack --region us-east-1 --capabilities CAPABILITY_IAM
```

### 2. Alexa Skill Configuration
1. In the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask), create a new skill named **Home Relay**.
2. Open **Interaction Model** -> **JSON Editor** and paste [apps/alexa/interaction-model.json](apps/alexa/interaction-model.json). Click **Save Model** and **Build Model**.
3. Under the **Endpoint** tab, select **AWS Lambda ARN** and paste the `AlexaFunctionArn` output from SAM.
4. Authorize Alexa to invoke your Lambda:
```bash
aws lambda add-permission \
  --function-name <AlexaFunctionArn> \
  --statement-id alexa-skill-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --event-source-token <YOUR_ALEXA_SKILL_ID>
```

---

## 🛡️ Limitations & Future Improvements

1. **In-Memory Demonstration State:** To ensure zero-friction testing without cloud provisioning costs, pantry inventory and action logs are backed by seeded JSON stores (`apps/server/data/`). Production transition involves migrating to Amazon DynamoDB or Amazon Aurora Serverless.
2. **Rule-Based to Hybrid Agentic Reasoning:** The current planner uses deterministic pattern matching. Future phases will integrate Amazon Bedrock Converse API with MCP tool calling for open-domain intent parsing.
3. **Push Notifications:** Errand assignments and reminders currently create structured simulated records; production implementation will bind to Amazon Simple Notification Service (SNS) or Alexa Proactive Events API.

---

## 📜 License
MIT License. Created for the Amazon Developer Hackathon.