# Sony Camera Live Tether

Real-time photo sync over local Wi-Fi.  
**Camera → Laptop FTP → WebSocket → phones/tablets (instant preview + auto-download)**

---

## How It Works

```
Sony Camera
    │  FTP upload (port 2121)
    ▼
Laptop (Node.js)
    │  chokidar detects new file
    │  WebSocket broadcast (port 3000)
    ▼
Android Phone + Tablet
    (browser shows photo + auto-downloads it)
```

---

## Prerequisites

- **Node.js 18+** — https://nodejs.org
- All devices on the **same Wi-Fi network**

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

The terminal will print your laptop's LAN IP, for example:

```
FTP  (camera)  →  ftp://192.168.1.42:2121
Live view      →  http://192.168.1.42:3000
Photos folder  →  /path/to/sony-tether/photos
```

### 3. Open the live view on phones/tablets

Open `http://192.168.1.42:3000` (use *your* IP) in Chrome on every Android device.

> **Tip — Android auto-download:** Chrome on Android will save files to  
> `Downloads/` automatically. Make sure the browser has storage permission.

---

## Sony Camera FTP Setup

Navigate to your Sony camera's network/transfer menu:

| Setting | Value |
|---|---|
| FTP Transfer Function | On |
| Server Settings → Hostname | `192.168.1.42` (your laptop IP) |
| Server Settings → Port | `2121` |
| Server Settings → User | *(leave blank / anonymous)* |
| Server Settings → Password | *(leave blank)* |
| Root Cert. Import | Not required |
| Destination Folder | `/` (root — maps to the `photos/` directory) |
| Auto Transfer | On (transfers after each shot) |

> Camera models vary slightly — look for **"FTP Transfer Func."** under  
> **Network → Transfer/Remote** settings.

---

## File Structure

```
sony-tether/
├── server.js          ← Backend: FTP + WebSocket + Express
├── package.json
├── photos/            ← Created automatically; camera saves here
└── public/
    └── index.html     ← Live-view frontend (open on every device)
```

---

## Features

- **Instant preview** — new photo appears in < 1 second after the shot
- **Camera flash effect** — white flash animation on every new photo
- **Filmstrip roll** — scrollable history of all received photos
- **Auto-download toggle** — turn off if you only want to preview
- **History on load** — reopening the page shows all previous photos
- **Auto-reconnect** — if Wi-Fi drops, browser reconnects automatically
- **PASV FTP** — works with Sony's passive-mode FTP client
- **Supports JPEG + RAW** — ARW, CR2, NEF, DNG, etc. all trigger the watcher

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera can't connect to FTP | Check laptop firewall — allow ports **2121** and **1024–1048** (PASV range) |
| Browser shows "Connecting…" | Make sure `npm start` is running; check the IP address matches |
| Auto-download not working | Allow storage permission in Chrome; check browser download settings |
| Photos folder filling up | Delete files from `photos/` manually — the server does not auto-purge |

---

## Development Mode (auto-restart on save)

```bash
npm run dev
```
