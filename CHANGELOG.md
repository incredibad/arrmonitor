# Changelog

All notable changes are documented here, newest first.

---

## [1.6.14] — 2026-04-23

### Changed
- Browser tab title now shows "Processing" instead of "Paused" when SABnzbd is paused but actively post-processing items, matching the card's behaviour

## [1.6.13] — 2026-04-23

### Changed
- Browser tab title polls every 2 s (SABnzbd) / 30 s (arr) when the window is active, and slows to 10 s for both when the window is in the background

## [1.6.12] — 2026-04-23

### Changed
- All three SABnzbd stat boxes now always reflect the status chip colour together rather than each lighting up independently based on their own content

## [1.6.11] — 2026-04-23

### Changed
- SABnzbd queue stat box now shows three lines: large queue count, small "IN QUEUE" label, and medium "12.7 GB left" size remaining

## [1.6.10] — 2026-04-23

### Changed
- SABnzbd card speed now displays as `MB/s` / `KB/s` instead of bare `M` / `K`
- SABnzbd stat box colours now match the status chip: green when downloading, amber when paused, blue when processing

## [1.6.9] — 2026-04-23

### Changed
- External link buttons on cards now have a visible border and background so they read as buttons rather than floating icons
- Queue page sub-bar external links replaced with labelled "Open ↗" buttons matching the same bordered style; instance name is no longer part of the link target

## [1.6.8] — 2026-04-23

### Changed
- Browser tab title now uses two independent polling loops: SABnzbd refreshes every 2 s (matching the dashboard card) while arr queue counts refresh every 30 s, so speed and status update in near real-time

## [1.6.7] — 2026-04-23

### Added
- SABnzbd card now shows a permanent status chip below the heading: `Idle` (grey), `Downloading (name)` (green), `Paused` (amber), or `Processing (name)` (blue) when paused but actively post-processing a download

## [1.6.6] — 2026-04-23

### Fixed
- SABnzbd card now shows the official SABnzbd logo (bundled SVG) instead of a generic download icon

## [1.6.5] — 2026-04-23

### Changed
- Browser tab title now shows SABnzbd speed/size/queue info: `22 MB/s - 22.4 GB left - (15) - ArrMonitor` when downloading, `Paused - 22.4 GB left - (15) - ArrMonitor` when paused; total item count includes both arr and SABnzbd queues; `⚠` prefix still appears when there are issues; removed `⬇` prefix; polls every 10 s

## [1.6.4] — 2026-04-23

### Added
- Bundled Sportarr logo from sportarr.net as static asset

## [1.6.3] — 2026-04-23

### Fixed
- Instance card logos (Sonarr, Radarr, Lidarr) now use bundled static assets (`/logos/*.png`) downloaded from official GitHub repos, eliminating any dependency on instance reachability from the browser; Sportarr falls back to inline SVG

## [1.6.1] — 2026-04-23

### Changed
- Instance cards now show the app's own logo image (fetched from the instance URL) with SVG fallback; SABnzbd card uses consistent 16px download icon
- Removed fixed `min-height` from instance and SABnzbd cards so card height is determined by content
- Colour scheme updated to cool steel-grey palette matching Sonarr/Radarr aesthetics (`--bg #0d1117`, `--text #e6edf3`)
- Border radius reduced to 3 px across all elements (cards, chips, inputs, modals)

## [1.6.0] — 2026-04-23

### Added
- SABnzbd integration: dashboard card showing speed, queue count, size remaining, and status
- SABnzbd queue page (`/sabnzbd/:id`) with active downloads (progress bars, ETA) and post-processing history (extracting, repairing, verifying, moving)
- Pause, Resume, and Pause For (5m/15m/30m/1h/3h/custom) controls on both the dashboard card and queue page
- SABnzbd instance management in Settings (add, edit, delete, enable/disable, test connection)
- `⬇` prefix in browser tab title when SABnzbd is actively downloading
- Indigo (`#818cf8`) colour theme for SABnzbd across cards, chips, and sub-bar tint

## [1.5.8] — 2026-04-20

### Changed
- Increased contrast throughout: page background darkened to near-black, card/surface backgrounds stepped up significantly so they lift off the page, border opacity raised from 0.08→0.14, elevation shadows strengthened, secondary and tertiary text colours lightened for readability

## [1.5.7] — 2026-04-20

### Changed
- Test mode toggle moved from nav bar to Settings page under a new Developer section
- Main nav bar height increased 48→56px; instance queue and settings sub-bars also taller
- Sub-bar sticky positions now use the CSS variable so they track the topbar height automatically
- Settings Add and Save buttons updated to amber to match the rest of the theme

## [1.5.6] — 2026-04-20

### Changed
- Nav bar: removed darker logo background and vertical divider, increased logo section and nav button padding for a cleaner unified look
- Topbar now shows "Dashboard" and "Settings" page titles alongside the existing instance name and "All Queues" titles

## [1.5.5] — 2026-04-20

### Changed
- Increased padding and spacing throughout: dashboard grid gap 12→16px, content padding 16→20px, instance card body padding and stat tile padding, queue item internal padding, and queue list gap and padding

## [1.5.4] — 2026-04-20

### Changed
- Queue item meta tags (release title, quality, CF score) are more readable — bumped from muted `text3` to `text2` colour with slightly higher background and border contrast
- File size moved out of the tag row and shown as plain monospace text on the right side of the meta row, below the status chip

## [1.5.3] — 2026-04-20

### Changed
- Instance cards: "In Queue" stat no longer counts issue items (they are already shown separately in the Issues stat)
- Browser tab: issue count now overrides the queue count — if issues exist only `⚠N ArrMonitor` is shown; the queue count only appears when there are no issues

## [1.5.2] — 2026-04-20

### Changed
- Instance queue sub-bar now uses a dark tint of the app's brand colour as its background (dark blue for Sonarr, dark amber for Radarr, dark green for Lidarr, dark teal for Sportarr), with a matching coloured bottom border

## [1.5.1] — 2026-04-20

### Changed
- Browser tab now shows issue items separately from the queue count: `(8) ⚠3 ArrMonitor` — issue items no longer inflate the main queue number

## [1.5.0] — 2026-04-20

### Added
- Test mode: click the flask icon in the nav bar to populate all queue views with simulated items covering every status (Downloading, Importing, Waiting, Paused, Issues, Queued) across Sonarr, Radarr, and Lidarr — no real data is fetched or modified while active
- Test mode persists across page reloads (localStorage) and shows an amber banner below the topbar as a clear indicator it is on
- Remove/import actions are no-ops in test mode so nothing real is triggered

## [1.4.0] — 2026-04-20

### Changed
- Full visual overhaul to Noir Amber palette: warm near-black backgrounds, amber/orange accent, cream text — replaces the generic indigo-navy look throughout
- Instance cards now use a coloured left border accent (3px, type-coloured) instead of the thin top stripe, making sonarr/radarr/lidarr distinction immediately readable
- Queue item progress bar is now a 2px amber strip pinned to the bottom edge of the card rather than a dedicated third row, making the list significantly denser
- Topbar now shows the current page/instance name as an uppercase breadcrumb centred between the logo and nav icons
- All amber-coloured interactive elements (import confirm, CTA button, focus rings, progress glow) updated to match the new accent
- Logo gradient updated from blue→amber to amber→orange

## [1.3.2] — 2026-04-20

### Changed
- Browser tab now shows total active queue count across all instances as `(12) ArrMonitor` instead of issue-only count with warning symbol

## [1.3.1] — 2026-04-20

### Changed
- CI now builds and pushes `incredibad/arrmonitor:dev` on every push to the `dev` branch (with a `dev-<sha>` tag too); git tagging remains `main`-only

## [1.3.0] — 2026-04-20

### Added
- Global activity queue at `/activity` — aggregates all enabled instances' queues into a single pageless view with the same status filters (Issues, Downloading, Importing, etc.)
- Each queue item in the global view shows an instance name badge (colour-coded by type) so you can tell at a glance which instance it belongs to
- Activity (list) icon in the top nav bar linking to `/activity`

## [1.2.4] — 2026-04-11

### Changed
- Import toast now uses an SVG `animateTransform` spinner (guaranteed to animate in all browsers)
- Queue item status updates to "Manually Importing" immediately after the import modal is confirmed
- Manual import modal header now shows the item's issue/warning messages beneath the title

## [1.2.3] — 2026-04-10

### Fixed
- Import toast now shows a dismiss (×) button on failed imports so they can be cleared

## [1.2.2] — 2026-04-10

### Changed
- Import toast is now centered horizontally and compact (single row: chip · title · episode · spinner)
- Removed instance name text, status message text, and dismiss button from toast
- Toast auto-dismisses after 3 s on success; stays visible on failure
- Episode/subtitle info (S01E02, album title, etc.) now shown in the toast

## [1.2.1] — 2026-04-10

### Changed
- Import status toasts no longer auto-dismiss; they persist until the user manually closes them with ×

## [1.2.0] — 2026-04-10

### Added
- Manual import now closes the modal immediately and shows a persistent toast at the bottom of the screen that polls the command status every 2 s
- Toast is coloured by app type (sonarr/radarr/lidarr/sportarr left-border accent) and shows the instance name, media title, and current status message
- Multiple simultaneous imports stack as separate toasts; each auto-dismisses 5 s after reaching a terminal state (completed/failed/aborted)
- Backend: added `GET /api/arr/:id/command/:commandId` proxy route for command status polling

## [1.1.8] — 2026-04-10

### Changed
- Manual Import modal header now shows the show/movie/artist title and episode subtitle (not the release filename)
- Candidate rows: release filename now wraps fully instead of truncating; match text (series/episode) removed, leaving only quality/size/CF/unmatched chips

## [1.1.7] — 2026-04-10

### Fixed
- Reverted queue item card layout to its previous state (episode subtitle and truncated release title restored)
- Manual Import modal now shows the full release filename as the heading instead of the show/movie title + episode code; filename wraps on mobile rather than truncating

## [1.1.6] — 2026-04-10

### Changed
- Queue item cards no longer show the episode code/title next to the show name
- Release filename is now shown in full (wraps on mobile) instead of being truncated with a click-to-expand modal; quality/size/CF tags sit below it

## [1.1.5] — 2026-04-10

### Changed
- Manual Import modal header now shows "MANUAL IMPORT" as a small accent label, with the show/movie/artist title as the main heading and the season+episode info (Sonarr/Sportarr) as a subtitle beneath it

## [1.1.4] — 2026-04-10

### Changed
- Modals (remove, manual import, warnings, release title) now appear centered in the screen on both desktop and mobile instead of sliding up as a bottom sheet

## [1.1.3] — 2026-04-09

### Changed
- Logo text now uses a smooth blue→amber gradient (`background-clip: text`) instead of two hard-coloured spans
- Login page logo now matches the topbar: includes the favicon icon, all-caps text, same gradient and letter-spacing

## [1.1.2] — 2026-04-09

### Fixed
- Update badge now only shows when the newest entry from the arr `/update` endpoint has `installed: false` — previously checked `array.length > 0` which was true even when on the latest version, causing all instances to show the update indicator

## [1.1.1] — 2026-04-09

### Fixed
- Update detection now queries the arr app's own `/update` endpoint (proxied through the backend) instead of comparing versions against GitHub releases. This is the same source the arr UI uses, so it will always agree with what Radarr/Sonarr/Lidarr shows internally. Removes dependency on GitHub API rate limits and the LinuxServer.io image list for update checks.

## [1.1.0] — 2026-04-09

### Changed
- Instance cards redesigned as vertical dashboard tiles: top accent stripe (full width with glow), larger bold name, chips on a dedicated row, stat tiles pushed to the bottom
- Stat tiles are now two equal-width blocks showing a large number with a label; when active they get a vivid coloured border and background so Queue vs Issues are immediately distinguishable
- Removed the chevron arrow from instance cards (the whole card is clickable)
- Dashboard grid now starts at 2 columns from 560px (was 640px) for a better mid-size layout
- Dashboard card skeleton height updated to match new taller cards
- Dashboard content padding increased slightly

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
