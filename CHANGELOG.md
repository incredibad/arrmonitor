# Changelog

All notable changes are documented here, newest first.

---

## [1.0.3] — 2026-04-09

### Fixed
- Frontend static files not served: `publicPath` was resolving to `/public` instead of `/app/public` due to an extra `..` in the path

## [1.0.2] — 2026-04-09

### Fixed
- LinuxServer.io version check now proxied through the backend to avoid CORS errors in the browser

## [1.0.1] — 2026-04-09

### Changed
- UI overhaul: switched from flat dark-gray palette to a deep navy/indigo theme with vivid accent colours
- Topbar now uses a glass morphism effect (backdrop blur + semi-transparent background)
- Instance cards and queue items have subtle borders and a hover lift animation
- Type stripes on instance cards widened to 4px with a matching colour glow
- Stat values on instance cards are now full-brightness white for better readability
- Progress bars thickened to 3px with a gradient fill and soft glow
- Meta pills on queue items use translucent glass-style backgrounds
- Primary action buttons (login, save, add, import) use an indigo gradient with a shadow
- Bottom sheet modals gain a backdrop blur overlay and a faint top border
- Status chip colours updated to more vivid Tailwind-palette equivalents (sky, violet, amber, etc.)
- Border radius increased slightly across cards and inputs for a softer feel

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
