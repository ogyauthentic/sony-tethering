# Sony Camera Live Tether

Real-time photo sync over local Wi‑Fi.
**Camera → Laptop FTP → WebSocket → phones/tablets (instant preview + auto-download)**

---

## How It Works

```text
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

- Node.js 18+
- npm
- All devices on the same Wi‑Fi network
- Nginx + certbot (optional, for HTTPS/reverse proxy)

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

The terminal prints the laptop IP and ports, for example:

```text
FTP  (camera)  →  ftp://192.168.1.42:2121
Live view      →  http://192.168.1.42:3000
Photos folder  →  /path/to/sony-tether/photos
```

### 3. Open the live view on phones/tablets

Open `http://192.168.1.42:3000` in Chrome on every Android device.

> Tip — Android auto-download: Chrome on Android will save files to `Downloads/` automatically. Make sure the browser has storage permission.

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

> Camera models vary slightly — look for **"FTP Transfer Func."** under **Network → Transfer/Remote** settings.

---

## Project Structure

```text
sony-tether/
├── server.js              ← backend: FTP + WebSocket + Express
├── index.html             ← live-view frontend
├── package.json
├── nginx/
│   └── sony-tethering.conf
├── systemd/
│   └── sony-tethering.service
├── photos/                ← created automatically; camera saves here
└── README.md
```

---

## Features

- Instant preview — new photo appears in under 1 second after the shot
- Camera flash effect — white flash animation on every new photo
- Filmstrip roll — scrollable history of all received photos
- Auto-download toggle — turn off if you only want to preview
- History on load — reopening the page shows all previous photos
- Auto-reconnect — if Wi‑Fi drops, browser reconnects automatically
- PASV FTP — works with Sony passive-mode FTP client
- Supports JPEG + RAW — ARW, CR2, NEF, DNG, etc. are all detected

---

## API Endpoints

- `GET /api/status` — information about IP and ports
- `GET /api/photos` — list of photos `(name, url, mtime)` newest first

WebSocket pushes JSON events such as:

```json
{ "type": "new_photo", "filename": "IMG_001.JPG", "url": "/photos/IMG_001.JPG", "timestamp": 123456789 }
```

---

## Production / Nginx + HTTPS

A reverse-proxy config for Nginx + HTTPS + WebSocket support is included in `nginx/sony-tethering.conf`.

### 1. Add WebSocket upgrade map to `/etc/nginx/nginx.conf`

```nginx
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # ... the rest of your config
}
```

### 2. Install the site config

```bash
sudo cp nginx/sony-tethering.conf /etc/nginx/sites-available/sony-tethering.conf
sudo ln -s /etc/nginx/sites-available/sony-tethering.conf /etc/nginx/sites-enabled/sony-tethering.conf
```

### 3. Replace domain names and SSL paths

Edit the file and replace:
- `your.domain.example` with your actual domain or IP
- `/etc/letsencrypt/live/...` with certbot-generated paths

### 4. Install certificate and reload Nginx

```bash
sudo certbot --nginx -d your.domain.example
sudo nginx -t
sudo systemctl reload nginx
```

---

## Systemd Service (background process)

A sample service file is available in `systemd/sony-tethering.service`.

```bash
sudo cp systemd/sony-tethering.service /etc/systemd/system/sony-tethering.service
sudo systemctl daemon-reload
sudo systemctl enable --now sony-tethering
sudo systemctl status sony-tethering
```

Edit the service file and set the correct `User=` and `WorkingDirectory=` before enabling it.

---

## Validation Scripts

This repo includes lightweight validation:

```bash
npm run lint
npm run test
```

- `npm run lint` runs ESLint on the Node server
- `npm run test` runs `node --check server.js`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Camera can't connect to FTP | Check laptop firewall — allow ports **2121** and **1024–1048** (PASV range) |
| Browser shows "Connecting…" | Make sure `npm start` is running; check the IP address matches |
| Auto-download not working | Allow storage permission in Chrome; check browser download settings |
| Photos folder filling up | Delete files from `photos/` manually |
| 502 Bad Gateway behind Nginx | Check Node service; ensure `proxy_pass http://127.0.0.1:3000` is correct |
| WebSocket stuck CONNECTING | Add `map $http_upgrade` and `proxy_set_header Upgrade/Connection` to Nginx |

---

## Development Mode

```bash
npm run dev
```

This uses Node's watch mode and restarts automatically when files change.

---

## Notes

This project is intended for local Wi‑Fi tethering, not for public internet use without proper firewall and TLS setup.

---

## License

MIT
