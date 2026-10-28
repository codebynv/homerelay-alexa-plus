// scripts/package-workspace.js
// Usage: node scripts/package-workspace.js <workspacePath>
// Example: node scripts/package-workspace.js apps/alexa
// This script works within the root of the monorepo using npm workspaces.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(msg) {
  console.log('[package-workspace]', msg);
}

function run(cmd, options = {}) {
  log(`Running: ${cmd}`);
  const env = { ...process.env, ...options.env };
  delete env.npm_config_allow_scripts;
  execSync(cmd, { stdio: 'inherit', ...options, env });
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  log(`Copied ${src} -> ${dest}`);
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    log(`Removed ${dir}`);
  }
}

function prunePackageJson(srcPkgPath, destPkgPath) {
  const pkg = JSON.parse(fs.readFileSync(srcPkgPath, 'utf8'));
  const pruned = {
    name: pkg.name,
    version: pkg.version,
    type: pkg.type,
    main: pkg.main || 'index.js',
    dependencies: pkg.dependencies || {},
    scripts: pkg.scripts || {},
    author: pkg.author,
    license: pkg.license,
  };
  fs.writeFileSync(destPkgPath, JSON.stringify(pruned, null, 2));
  log(`Created trimmed package.json at ${destPkgPath}`);
}

function removeUnneededFiles(distDir) {
  const patterns = ['**/__tests__', '**/*.test.*', '**/*.map', '**/*.zip'];
  const glob = require('glob');
  patterns.forEach(pat => {
    const matches = glob.sync(pat, { cwd: distDir, absolute: true, nodir: false });
    matches.forEach(p => {
      fs.rmSync(p, { recursive: true, force: true });
      log(`Removed unwanted ${p}`);
    });
  });
}

function zipDirectory(sourceDir, zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
    log(`Removed prior zip at ${zipPath}`);
  }
  // Use PowerShell with properly escaped paths to handle spaces and fail immediately on error
  const cmd = `powershell -Command "$ErrorActionPreference = 'Stop'; Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  run(cmd);
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Failed to create zip package at ${zipPath}`);
  }
  log(`Created zip at ${zipPath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: node scripts/package-workspace.js <workspacePath>');
    process.exit(1);
  }
  const workspace = args[0];
  const workspaceRoot = path.resolve(workspace);
  const distDir = path.join(workspaceRoot, 'dist');

  // Clean previous dist
  cleanDir(distDir);

  // Install all dependencies (including dev) for compilation
  // Skipping npm ci for workspace (dev deps already installed at root)

  // Compile TypeScript using local TypeScript version
  // Compile TypeScript using local TypeScript version
  run('npx tsc -p .', { cwd: workspaceRoot });


  // Copy and prune package.json into dist
  const srcPkg = path.join(workspaceRoot, 'package.json');
  const destPkg = path.join(distDir, 'package.json');
  copyFile(srcPkg, destPkg);
  prunePackageJson(destPkg, destPkg);

  // Copy root lockfile for reproducible install
  const rootLockfile = path.resolve('package-lock.json');
  if (fs.existsSync(rootLockfile)) {
    fs.copyFileSync(rootLockfile, path.join(distDir, 'package-lock.json'));
    log('Copied root package-lock.json to dist');
  }
  // Install production dependencies within dist using lockfile
  run('npm ci --omit=dev --ignore-scripts', { cwd: distDir });

  // Copy data directory if present (seeded JSON files)
  const srcDataDir = path.join(workspaceRoot, 'data');
  if (fs.existsSync(srcDataDir)) {
    const destDataDir = path.join(distDir, 'data');
    fs.cpSync(srcDataDir, destDataDir, { recursive: true });
    log(`Copied data directory to ${destDataDir}`);
  }

  // Remove unwanted files
  removeUnneededFiles(distDir);

  // Create zip artifact named <workspace>.zip at workspace root (outside dist)
  const zipName = path.basename(workspace) + '.zip';
  const zipPath = path.join(workspaceRoot, zipName);
  zipDirectory(distDir, zipPath);
  log(`Created artifact ${zipPath}`);

}

main();
