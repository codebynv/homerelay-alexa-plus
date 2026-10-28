// scripts/serve-frontend.js
// Secure, production-ready static server for apps/web/dist (SPA support)
// Strictly prevents path traversal, disables directory indexing, and serves only dist assets.

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../apps/web/dist");
const PORT = Number(process.env.FRONTEND_PORT || 3000);
const HOST = process.env.FRONTEND_HOST || "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  // Only allow GET and HEAD methods
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    return res.end("Method Not Allowed");
  }

  // Parse and normalize path
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  let safePath = path.normalize(path.join(DIST_DIR, urlPath));

  // Security: Guard against path traversal outside DIST_DIR
  if (!safePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  // If path is a directory or root, target index.html
  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    safePath = path.join(safePath, "index.html");
  }

  // SPA fallback: If requested file does not exist, serve index.html
  if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    safePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(safePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not Found: Dist build missing");
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });

  if (req.method === "HEAD") {
    return res.end();
  }

  const stream = fs.createReadStream(safePath);
  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[frontend-server] Serving ${DIST_DIR} on http://${HOST}:${PORT}`);
});
