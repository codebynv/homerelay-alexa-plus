# HomeRelay Deployment Guide

## Architecture Overview

HomeRelay consists of four components, but **only two are deployed via SAM**:

| Component | Type | Deployed by SAM? | Description |
|-----------|------|------------------|-------------|
| **Alexa Lambda** | `AWS::Serverless::Function` | ✅ Yes | Handles Alexa skill requests, calls MCP via HTTP |
| **MCP Lambda** | `AWS::Serverless::Function` | ✅ Yes | JSON-RPC endpoint for MCP tools (check_pantry, etc.) |
| **MCP API Gateway** | `AWS::Serverless::HttpApi` | ✅ Yes | Public HTTPS endpoint at `/prod/mcp` |
| **Express REST Server** | Node.js/Express | ❌ No | Serves `/api/*` routes for React frontend |
| **React Frontend** | Static SPA (Vite/React) | ❌ No | Web dashboard at `http://localhost:3000` (dev) |

## Current SAM Template Resources

```yaml
Resources:
  AlexaFunction:      # Lambda for Alexa skill
  McpFunction:        # Lambda for MCP JSON-RPC
  McpApi:             # API Gateway HttpApi (stage: prod, route: POST /mcp)
  McpApiPermission:   # Grants API Gateway lambda:InvokeFunction on McpFunction
```

**NOT deployed by SAM:**
- Express server (REST API at `/api/pantry`, `/api/members`, `/api/plan`, `/api/execute`, etc.)
- React frontend (static assets)

## Required Production Hosting Decisions

You must choose hosting for the two non-SAM components:

### Option A: Minimal AWS (Recommended)
| Component | AWS Service | Notes |
|-----------|-------------|-------|
| Express Server | AWS App Runner or Lambda + API Gateway | App Runner: container-based, auto-scales. Lambda: requires API Gateway HTTP API + Lambda proxy integration. |
| React Frontend | AWS Amplify Hosting or S3 + CloudFront | Amplify: git-based CI/CD, custom domain, HTTPS. S3+CloudFront: manual but cheaper. |

### Option B: External (Simpler)
| Component | Service | Notes |
|-----------|---------|-------|
| Express Server | Render, Railway, Fly.io, Heroku | Push Dockerfile or Node.js app |
| React Frontend | Vercel, Netlify, Cloudflare Pages | Git-based deploy, automatic HTTPS |

## Environment Variables

### Build-time (Frontend)
```bash
# Required for production build – set to the Express REST server URL (hosting /api/* and /health)
# Example: VITE_API_BASE=https://your-express-server.example.com
VITE_API_BASE=https://your-express-server.example.com
```
Set in your CI/CD or build environment. **Do not commit `.env.local` or `.env.production`.**

### Runtime (Express Server)
```bash
# Comma-separated allowed origins
CORS_ORIGIN=https://your-frontend.example.com,https://www.your-frontend.example.com
```
Set in your hosting platform's environment variables.

### SAM Template (Auto-configured)
```yaml
# AlexaFunction.Environment.MCP_URL is auto-generated:
MCP_URL: https://{McpApi}.execute-api.{Region}.amazonaws.com/prod/mcp
```

## Deployment Sequence

### 1. Build and Deploy SAM Stack (Alexa + MCP)
```bash
# 1a. Package TypeScript workspaces into zip artifacts
node scripts/package-workspace.js apps/server
node scripts/package-workspace.js apps/alexa

# 1b. Build SAM application from template.yaml
sam build

# 1c. Deploy SAM stack (requires AWS credentials configured)
sam deploy --guided
# Note the McpEndpoint and AlexaFunctionArn output values
```

### 2. Deploy Express Server
**App Runner example:**
```dockerfile
# Dockerfile at apps/server/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY data ./data
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

```bash
# Build
cd apps/server
npm run build  # compiles TypeScript to dist/
docker build -t homerelay-server .
# Push to ECR, create App Runner service
# Set env: CORS_ORIGIN=https://your-frontend.example.com
```

### 3. Deploy React Frontend
**Amplify example:**
```bash
# In Amplify Console: connect repo
# Build settings:
#   Build command: VITE_API_BASE=https://your-express-server.example.com npm run build
#   Output directory: apps/web/dist
#   Env var: VITE_API_BASE=https://your-express-server.example.com
```

### 4. Wire Everything Together
| Value | Source | Where to Set |
|-------|--------|--------------|
| `VITE_API_BASE` | Live Express server URL | Frontend build env (set BEFORE building frontend assets) |
| `CORS_ORIGIN` | Live Frontend URL | Express server runtime env |
| `MCP_URL` | SAM `McpEndpoint` output | Auto-configured in Alexa Lambda environment by SAM |

### 5. Configure Alexa Skill Endpoint & Lambda Invoke Permission
1. In the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) under your skill's **Endpoint** tab:
   - Select **AWS Lambda ARN**.
   - Under **Default Region**, paste the `AlexaFunctionArn` output from SAM (e.g., `arn:aws:lambda:us-east-1:<account-id>:function:homerelay-stack-AlexaFunction-...`).
2. Run the AWS CLI command to grant the Alexa service permission to invoke your Lambda function:
```bash
aws lambda add-permission \
  --function-name <AlexaFunctionArn> \
  --statement-id alexa-skill-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --event-source-token <YOUR_ALEXA_SKILL_ID>
```

## Local Development

```bash
# Terminal 1: Express server (port 4000)
cd apps/server && npm run dev

# Terminal 2: React frontend (port 3000)
cd apps/web && npm run dev

# Terminal 3: MCP server (optional, port 4001)
cd apps/server && npm run dev:mcp
```

Frontend defaults to `http://127.0.0.1:4000` for API calls.
CORS defaults to `http://127.0.0.1:3000`.

## Verification Checklist

- [ ] SAM stack deploys successfully (Alexa, MCP, API Gateway)
- [ ] `McpEndpoint` output is a valid HTTPS URL
- [ ] Express server responds to `/health` and `/api/*` routes
- [ ] Express `CORS_ORIGIN` includes frontend URL
- [ ] Frontend builds with correct `VITE_API_BASE`
- [ ] Frontend loads and calls `/api/plan`, `/api/execute` successfully
- [ ] Alexa skill can invoke MCP via API Gateway
- [ ] MCP tools (check_pantry, etc.) return expected results

## Local Validation & Automation Commands

To run the complete automated pre-deployment pipeline (typechecks, unit tests, artifact packaging, SAM build, SAM template validation, and frontend compilation):
```bash
npm run prepare:deploy
```

Individual validation commands:
```bash
# Complete automated pre-deployment check & build
node scripts/prepare-deployment.js

# Template validation using SAM CLI
sam validate -t template.yaml --lint

# CloudFormation validation with cfn-lint
python -c "import cfnlint.runner, sys; sys.exit(cfnlint.runner.main())" --template template.yaml

# TypeScript checks
npm --workspace apps/alexa run typecheck
npm --workspace apps/server run typecheck
npm --workspace apps/web run build

# Unit tests
npm --workspace apps/alexa run test
npm --workspace apps/server run test

# Lambda deployment packages
node scripts/package-workspace.js apps/server
node scripts/package-workspace.js apps/alexa
```

## Known Limitations & Configuration Details

1. **Data Persistence**: In-memory state and seeded local JSON files (`data/pantry.json`, `data/members.json`, `data/preferences.json`, `data/records.json`) are bundled inside the server container and Lambda zip. Lambda execution is stateless; persistent storage (e.g., DynamoDB or S3) would be required for persistent cross-session writes beyond this hackathon demo.
2. **Alexa Skill & REST State Separation**: The Alexa skill interacts with the MCP Lambda (`check_pantry`, `resolve_substitutions`, `generate_plan`, `send_notification`). The React frontend interacts with the Express REST server (`/api/pantry`, `/api/plan`, etc.). They operate on identical seeded demonstration data rather than a unified real-time database.
3. **cfn-lint E3012**: Ignored via `.cfnlintrc`. CloudFormation specification for `RetentionInDays` is an integer, but cfn-lint 1.58.0 schema checks for string.
4. **SAM validate (full IAM check)**: `sam validate -t template.yaml --region <region>` performs remote IAM checks when AWS credentials are configured. Running with `--lint` performs full schema and CloudFormation validation offline without credentials.
5. **No git repository**: The project workspace is not initialized as a git repository. Do not run git commands unless you explicitly initialize git.

## File Inventory

### Production & Deployment Artifacts
- `template.yaml` - SAM template containing `AlexaFunction`, `McpFunction`, `McpApi`, and `McpApiPermission`
- `apps/server/Dockerfile` - Docker container definition for Express REST server (`node:22-alpine`)
- `apps/server/server.zip` - Packaged Lambda ZIP for `McpFunction`
- `apps/alexa/alexa.zip` - Packaged Lambda ZIP for `AlexaFunction`
- `scripts/package-workspace.js` - Automated TypeScript compilation and dependency-pruning packager
- `scripts/prepare-deployment.js` - Consolidated pre-deployment validation and build script (`npm run prepare:deploy`)

### Source Enhancements
- `apps/server/src/mcp-lambda.ts` - HTTP API Payload Format 2.0 compatible handler (`requestContext.http.method`, `rawPath`, safe body parsing)
- `apps/alexa/src/index.ts` - Production-ready Alexa skill with `LaunchRequest`, `CheckPantryIntent`, `HelpIntent`, `CancelAndStopIntent`, `SessionEndedRequest`, and client reconnect recovery
- `apps/web/src/api.ts` - Configurable `VITE_API_BASE` for production REST backend
- `apps/web/vite.config.ts` - Injects `VITE_API_BASE` at build time
- `apps/server/src/server.ts` - Configurable `CORS_ORIGIN` for production frontend communication