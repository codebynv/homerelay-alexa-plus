# HomeRelay – Alexa+ Documentation

Welcome to the **HomeRelay – Alexa+** project documentation.

## Overview
- **Frontend** (`apps/web`) – React + TypeScript + Vite. Displays the HomeRelay name and backend health status.
- **Backend** (`apps/server`) – Node.js + TypeScript. Exposes a simple `/health` endpoint.
- **Workspace** – Root `package.json` defines npm workspaces (`apps/*`) and scripts for development, building, and type‑checking.

## Quick Start
```powershell
# From the project root
npm install               # install dependencies
npm run dev:web           # start the Vite dev server (http://localhost:5173)
npm run dev:server        # start the backend (http://localhost:4000)
```

## Project Structure
```
/ (root)
├─ apps/
│  ├─ web/
│  │  ├─ index.html
│  │  └─ src/
│  │     ├─ App.tsx
│  │     └─ main.tsx
│  └─ server/
│     └─ src/
│        ├─ server.ts
│        └─ index.ts
├─ docs/
│  └─ README.md
├─ tsconfig.base.json
├─ package.json
└─ (PROJECT_BRIEF.md, ARCHITECTURE.md, etc.)
```

## Further Development
- Extend the backend with additional routes under `apps/server/src`.
- Add more UI components in `apps/web/src`.
- Run `npm run build:web` to generate a production build.
- Use `npm run typecheck:server` to validate server TypeScript types.
