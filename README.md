<p align="center">
  <img src=".github/logo.svg" width="260" alt="ArrMonitor" />
</p>

> [!WARNING]
> This project was built with AI assistance. Code may not meet production safety standards — review carefully before deploying in sensitive environments.
>
> **Note from the author:** This was made as a personal tool, and I'd like to share it with the community. I understand that AI can be both controversial and fallible. I have followed the AI coding and updates with security in mind, and have done multiple audits to try and find vulnerabilities and security leaks. However, there is always the risk of bad things happening — if you are security conscious or dubious, keep the app on your local network only, and/or behind a third-party auth app.

A self-hosted mobile-first PWA for monitoring and managing download queues across multiple Sonarr, Radarr, Lidarr, and Sportarr instances — all from one clean dark interface.

## Screenshots

<!-- Add screenshots to .github/ and uncomment below -->
<!-- <img src=".github/dashboard.png" width="100%" alt="Dashboard" /> -->
<!-- <img src=".github/queue.png" width="100%" alt="Queue view" /> -->

---

## Features

- **Global Activity Queue** — View all downloads across every instance in a single unified list
- **Per-Instance Queues** — Drill into any instance to see its full queue with status filters
- **Manual Import** — Trigger manual imports directly from the queue without opening the arr app
- **Remove & Blacklist** — Remove queue items with optional blacklisting in one tap
- **Status Filters** — Filter by Downloading, Importing, Waiting, Paused, Issues, or Queued
- **Issue Highlighting** — Failed and warning items are called out separately from the queue count
- **Tab Notifications** — Browser tab shows live queue and issue counts at a glance
- **Per-App Theming** — Sub-bar colours adapt to the instance type (Sonarr blue, Radarr yellow, etc.)
- **Test Mode** — Populate the UI with simulated queue data to preview the interface without real downloads
- **Mobile-First PWA** — Installable on Android and iOS; works offline-ready
- **Auto-Refresh** — Queues poll every 15–30 seconds in the background
- **First-Run Setup** — Detects no admin user on first launch and prompts to create one

---

## Installation

### Docker Compose (recommended)

Create a `docker-compose.yml` with the following content:

```yaml
services:
  arrmonitor:
    image: incredibad/arrmonitor:latest
    container_name: arrmonitor
    ports:
      - "6767:6767"
    environment:
      - SESSION_SECRET=change-this-to-a-random-secret
      - POSTGRES_PASSWORD=change-this-password
      - DATABASE_URL=postgres://arrmonitor:change-this-password@postgres:5432/arrmonitor
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: arrmonitor-db
    volumes:
      - arrmonitor_db:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=arrmonitor
      - POSTGRES_PASSWORD=change-this-password
      - POSTGRES_DB=arrmonitor
    restart: unless-stopped

volumes:
  arrmonitor_db:
```

Then run:

```bash
docker compose up -d
```

Open **http://your-server:6767** — you'll be prompted to create an admin account.

### Docker Run

ArrMonitor requires PostgreSQL. Start the database first, then the app:

```bash
docker volume create arrmonitor_db

docker run -d \
  --name arrmonitor-db \
  --restart unless-stopped \
  -v arrmonitor_db:/var/lib/postgresql/data \
  -e POSTGRES_USER=arrmonitor \
  -e POSTGRES_PASSWORD=change-this-password \
  -e POSTGRES_DB=arrmonitor \
  postgres:16-alpine

docker run -d \
  --name arrmonitor \
  --restart unless-stopped \
  -p 6767:6767 \
  --link arrmonitor-db:postgres \
  -e SESSION_SECRET=change-this-to-a-random-secret \
  -e POSTGRES_PASSWORD=change-this-password \
  -e DATABASE_URL=postgres://arrmonitor:change-this-password@postgres:5432/arrmonitor \
  -e NODE_ENV=production \
  incredibad/arrmonitor:latest
```

### Updating

```bash
docker compose pull && docker compose up -d
```

---

## First-Run Setup

1. Open the app and create your admin account
2. Go to **Settings** and add your first instance:

| Setting | Where to find it |
|---|---|
| Instance Name | Any label you like (e.g. `Sonarr`, `Radarr 4K`) |
| Type | Sonarr, Radarr, Lidarr, or Sportarr |
| URL | e.g. `http://your-server:8989` |
| API Key | In each app: **Settings → General → Security → API Key** |

3. Tap **Test Connection** to verify, then save
4. Return to the Dashboard to see live queue stats
5. Tap any instance card to view its full queue
6. Tap a queue item to expand actions (Manual Import / Remove)

### Installing as a PWA

- **Android (Chrome):** Tap the three-dot menu → "Add to Home screen"
- **iOS (Safari):** Tap the Share button → "Add to Home Screen"

---

## Data Persistence

| Volume | Contents |
|---|---|
| `arrmonitor_db` | PostgreSQL database — all instances, users, and session data |

The volume survives `docker compose pull && docker compose up -d` updates. Your instances and account are preserved across upgrades.

---

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React 18, Vite, CSS Modules, Lucide icons
- **Deployment**: Docker, nginx (reverse proxy bundled in image)

## License

MIT — see [LICENSE](LICENSE)
