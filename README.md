# ArrMonitor

A mobile-first PWA for monitoring and managing queues across multiple Sonarr, Radarr, and Lidarr instances. Runs entirely in Docker.

## Features

- 📱 Mobile-first PWA — installable on Android & iOS
- 📡 Monitor multiple *arr instances from one dashboard
- 🔄 Auto-refreshing queues (every 15–30 seconds)
- ✅ Manual Import trigger per instance
- 🗑️ Remove queue items (with optional blacklisting)
- 🏷️ Filter queue by status (downloading, failed, paused, etc.)
- ⚡ Live status indicators and error highlighting
- 🌙 Dark theme optimised for low-light viewing

## Quick Start

### 1. Clone / copy files

```bash
cd arrmonitor
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD
```

No need to configure API URLs — nginx automatically proxies `/api` calls from the frontend to the backend, so the app works from any IP or hostname.

### 3. Run

```bash
docker compose up -d
```

The app will be available at `http://YOUR_SERVER_IP:6767`

### 4. Add to Home Screen (PWA)

- **Android (Chrome):** Tap the three-dot menu → "Add to Home screen"
- **iOS (Safari):** Tap the Share button → "Add to Home Screen"

## Usage

1. Open the app and tap **Settings**
2. Add your *arr instance — name, type, URL, and API key
3. Use **Test Connection** to verify connectivity
4. Return to Dashboard to see live queue stats
5. Tap any instance card to see the full queue
6. Tap a queue item to expand actions (Manual Import / Remove)

## Finding Your API Key

- **Sonarr/Radarr/Lidarr:** Settings → General → Security → API Key

## Ports

| Service    | Port |
|------------|------|
| ArrMonitor | 6767 |
| Postgres   | 5432 (internal only) |

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Architecture

```
frontend (React + Vite PWA)  →  nginx :80
backend  (Node/Express)       →  :3001
postgres (PostgreSQL 16)      →  internal
```

The backend acts as a secure proxy — API keys are stored in Postgres and never exposed to the browser.
