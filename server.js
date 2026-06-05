/**
 * Sony Camera Live Tether — server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Starts three services on your laptop:
 *   • FTP  server on port 2121  ← Sony camera sends photos here
 *   • HTTP server on port 3000  ← Phones/tablets open this in a browser
 *   • WebSocket on port 3000    ← Pushes "new photo" events to every client
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import os from "os";

import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import chokidar from "chokidar";
import FtpSrv from "ftp-srv";

// ─── Paths ────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, "photos");
const PUBLIC_DIR = path.join(__dirname, "public");

// Create required directories
[PHOTOS_DIR, PUBLIC_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ─── Detect local IP ──────────────────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) return alias.address;
    }
  }
  return "127.0.0.1";
}
const LOCAL_IP = getLocalIP();

// ─── Express + HTTP ───────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

app.use("/photos", express.static(PHOTOS_DIR));
app.use(express.static(PUBLIC_DIR));

// Health / info endpoint
app.get("/api/status", (_req, res) => {
  res.json({
    ip: LOCAL_IP,
    ftpPort: 2121,
    httpPort: 3000,
    photosDir: PHOTOS_DIR,
  });
});

// List all photos (newest first) so the client can show history on load
app.get("/api/photos", (_req, res) => {
  try {
    const files = fs
      .readdirSync(PHOTOS_DIR)
      .filter((f) => /\.(jpe?g|png|arw|raw|cr2|nef|dng|heic|tiff?)$/i.test(f))
      .map((f) => {
        const stat = fs.statSync(path.join(PHOTOS_DIR, f));
        return { name: f, url: `/photos/${f}`, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json(files);
  } catch {
    res.json([]);
  }
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  });
}

wss.on("connection", (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[WS]  Client connected   — ${clientIP}  (total: ${wss.clients.size})`);
  ws.send(JSON.stringify({ type: "welcome", ip: LOCAL_IP }));

  ws.on("close", () =>
    console.log(`[WS]  Client disconnected — ${clientIP}  (total: ${wss.clients.size})`)
  );
});

// ─── File Watcher ─────────────────────────────────────────────────────────────
// Waits until a file stops growing before broadcasting (handles slow transfers)
const pendingFiles = new Map();

chokidar
  .watch(PHOTOS_DIR, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
  })
  .on("add", (filePath) => {
    const filename = path.basename(filePath);
    if (!/\.(jpe?g|png|arw|raw|cr2|nef|dng|heic|tiff?)$/i.test(filename)) return;

    console.log(`[FS]  New photo detected — ${filename}`);

    const payload = {
      type: "new_photo",
      filename,
      url: `/photos/${encodeURIComponent(filename)}`,
      timestamp: Date.now(),
    };

    broadcast(payload);
    console.log(`[WS]  Broadcast → ${wss.clients.size} client(s)`);
  });

// ─── FTP Server ───────────────────────────────────────────────────────────────
const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:2121`,
  pasv_url: LOCAL_IP,       // PASV mode uses the real LAN IP
  pasv_min: 1024,
  pasv_max: 1048,
  anonymous: true,
  greeting: ["Sony Camera Tether — ready"],
});

ftpServer.on("login", ({ connection, username }, resolve, reject) => {
  console.log(`[FTP] Login — user: ${username || "anonymous"}`);
  resolve({ root: PHOTOS_DIR });
});

ftpServer.on("client-error", ({ connection, context, error }) => {
  console.error("[FTP] Client error:", error?.message ?? error);
});

// ─── Start everything ─────────────────────────────────────────────────────────
const HTTP_PORT = 3000;

ftpServer.listen().then(() => {
  console.log(`[FTP] Listening on  ftp://${LOCAL_IP}:2121`);
});

httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          Sony Camera Live Tether — RUNNING           ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  FTP  (camera)  →  ftp://${LOCAL_IP}:2121          `);
  console.log(`║  Live view      →  http://${LOCAL_IP}:${HTTP_PORT}           `);
  console.log(`║  Photos folder  →  ${PHOTOS_DIR}`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Open the live-view URL on every Android phone/tablet.");
  console.log("Configure your Sony camera FTP target to this laptop.\n");
});
