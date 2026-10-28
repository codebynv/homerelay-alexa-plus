// scripts/prepare-deployment.js
// Safe, automated local pre-deployment preparation for HomeRelay
// Verifies code, runs tests, packages Lambdas, builds SAM template, and validates frontend build.
// Fails immediately on any error.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function log(step, msg) {
  console.log(`\n\x1b[36m[Step ${step}]\x1b[0m \x1b[1m${msg}\x1b[0m`);
}

function run(cmd, cwd = ROOT_DIR, env = {}) {
  console.log(`> ${cmd} (in ${cwd})`);
  const childEnv = { ...process.env, ...env };
  delete childEnv.npm_config_allow_scripts;
  execSync(cmd, { cwd, stdio: "inherit", env: childEnv });
}

function check(label, fn) {
  process.stdout.write(`  Checking ${label}... `);
  try {
    fn();
    console.log(`\x1b[32mOK\x1b[0m`);
  } catch (err) {
    console.log(`\x1b[31mFAILED\x1b[0m (${err.message})`);
    throw err;
  }
}

async function main() {
  const startTime = Date.now();
  console.log("=================================================");
  console.log("   HomeRelay Pre-Deployment Preparation Pipeline");
  console.log("=================================================");

  // Ensure AWS CLI v2 directory is in PATH on Windows
  if (process.platform === "win32") {
    const awsCliDir = "C:\\Program Files\\Amazon\\AWSCLIV2";
    if (fs.existsSync(awsCliDir) && (!process.env.PATH || !process.env.PATH.includes(awsCliDir))) {
      process.env.PATH = `${awsCliDir};${process.env.PATH || ""}`;
    }
  }

  // 1. Tool availability checks
  log(1, "Verifying CLI and environment tools");
  check("Node.js", () => run("node --version", ROOT_DIR));
  check("npm", () => run("npm --version", ROOT_DIR));
  check("SAM CLI", () => run("sam --version", ROOT_DIR));
  
  // Check AWS CLI
  try {
    check("AWS CLI", () => run("aws --version", ROOT_DIR));
  } catch {
    console.log("  \x1b[33m[Notice] 'aws' CLI command not found in PATH or standard installation directory.\x1b[0m");
  }

  // 2. Automated Unit Tests & Typechecks
  log(2, "Running unit tests and typechecks across workspaces");
  run("npm --workspace apps/alexa run typecheck");
  run("npm --workspace apps/alexa run test");
  run("npm --workspace apps/server run typecheck");
  run("npm --workspace apps/server run test");

  // 3. Package Lambda Workspaces
  log(3, "Packaging Lambda deployment archives");
  run("node scripts/package-workspace.js apps/server");
  run("node scripts/package-workspace.js apps/alexa");

  check("server.zip artifact", () => {
    const p = path.join(ROOT_DIR, "apps/server/server.zip");
    if (!fs.existsSync(p) || fs.statSync(p).size < 1000000) throw new Error("Missing or invalid server.zip");
  });

  check("alexa.zip artifact", () => {
    const p = path.join(ROOT_DIR, "apps/alexa/alexa.zip");
    if (!fs.existsSync(p) || fs.statSync(p).size < 1000000) throw new Error("Missing or invalid alexa.zip");
  });

  // 4. SAM Build & Validation
  log(4, "Building and validating SAM CloudFormation application");
  run("sam build");
  run("sam validate -t template.yaml --lint");

  // 5. Frontend Production Build
  log(5, "Verifying React frontend production build");
  const hasCustomApiBase = Boolean(process.env.VITE_API_BASE);
  const targetApiBase = process.env.VITE_API_BASE || "https://api.example.com";
  if (!hasCustomApiBase) {
    console.log(`  \x1b[33m[Notice] VITE_API_BASE not set. Using dry-run placeholder '${targetApiBase}' for build validation.\x1b[0m`);
    console.log(`  \x1b[33m         Before production deployment, set VITE_API_BASE to your deployed Express backend URL.\x1b[0m`);
  } else {
    console.log(`  Target production VITE_API_BASE: ${targetApiBase}`);
  }
  run("npm --workspace apps/web run build", ROOT_DIR, { VITE_API_BASE: targetApiBase });

  check("frontend dist/index.html", () => {
    const p = path.join(ROOT_DIR, "apps/web/dist/index.html");
    if (!fs.existsSync(p)) throw new Error("Missing dist/index.html");
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=================================================");
  console.log(`\x1b[32m✔ Pre-Deployment Preparation PASSED in ${elapsed}s!\x1b[0m`);
  console.log("=================================================");
  console.log("Ready for deployment execution:");
  console.log("  • SAM Stack:       template.yaml -> .aws-sam/build");
  console.log("  • Server Docker:   apps/server/Dockerfile");
  console.log("  • Web Assets:      apps/web/dist/");
  console.log("  • Alexa Model:     apps/alexa/skill.json");
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("\n\x1b[31m[ERROR] Deployment preparation failed:\x1b[0m", err.message);
  process.exit(1);
});
