# Changelog

All notable changes are documented here, newest first.

---

## [1.0.0] — 2026-04-08

### Added
- Docker-contained PWA for monitoring and managing queues across multiple Sonarr, Radarr, and Lidarr instances
- Dashboard with live queue stats and auto-refresh (15–30 seconds)
- Per-instance queue view with expandable items — Manual Import and Remove (with optional blacklisting)
- Status filters: downloading, failed, paused, etc.
- Multi-instance support — add, edit, and test *arr connections from Settings
- Login with session-based auth backed by PostgreSQL
- Mobile-first dark UI, installable as a PWA on Android (Chrome) and iOS (Safari)
- Single Docker image serving both frontend (built React/Vite) and backend (Express API + static files)
