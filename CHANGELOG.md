# Changelog

All notable changes are documented here, newest first.

---

## [1.17.10] — 2026-04-27

### Fixed
- Tab notification `refreshArr` and `refreshClients` now have concurrency guards — previously both could pile up concurrent requests, doubling backend load alongside the GlobalQueue's own polling

## [1.17.9] — 2026-04-27

### Fixed
- Queue fetch timeout reduced from 12s to 5s and switched from `AbortSignal.timeout()` to `AbortController` for reliable cross-Node.js-version support
- GlobalQueue polling now skips a cycle if the previous fetch is still in-flight, preventing request pile-up when instances are slow

## [1.17.8] — 2026-04-27

### Fixed
- All App Queues no longer fires `RefreshMonitoredDownloads` commands to every instance on each poll — these were the 12–57s 502 errors visible in the network tab causing the page to stall

## [1.17.7] — 2026-04-27

### Fixed
- All App Queues no longer hangs for up to 37 seconds when an instance is slow or unreachable; timeouts and connection-refused errors now fail immediately instead of being retried twice (only genuine ECONNRESET transient errors are retried)

## [1.17.6] — 2026-04-27

### Fixed
- SABnzbd card queue count now includes actively processing items (Extracting, Repairing, Verifying, Moving, Running)

## [1.17.5] — 2026-04-27

### Fixed
- SABnzbd extracting items parse file count from action line (e.g. "Unpacking: 01/22") as a fallback progress percentage when SABnzbd reports 0%

## [1.17.4] — 2026-04-27

### Fixed
- Indeterminate processing shimmer is now a smooth gradient sweep rather than a jarring solid block

## [1.17.3] — 2026-04-27

### Fixed
- SABnzbd extracting/processing items now always show a background progress indicator; when the percentage is unavailable or zero an animated shimmer is shown, transitioning to a percentage fill once SABnzbd reports actual progress

## [1.17.2] — 2026-04-27

### Changed
- Progress bars removed from queue item rows across all views (Arr queues, SABnzbd, qBittorrent, All Download Clients); progress is now shown as a subtle background fill on the card itself using a `::before` pseudo-element, keeping text fully readable while giving a clear visual indication of progress

## [1.17.1] — 2026-04-27

### Added
- SABnzbd processing items (Extracting, Repairing, Verifying, Moving) now show a progress bar and percentage in both the SABnzbd detail queue and the All Download Clients view; the action line (e.g. current file being extracted) is shown as sub-text

## [1.17.0] — 2026-04-27

### Added
- New "All Download Clients" page at `/download-clients` showing every SABnzbd slot and qBittorrent torrent as individual rows, sorted Error → Processing → Downloading → Paused → Seeding
- Each row shows a client/instance chip, name, status chip, progress %, ETA, speed, category, and a progress bar strip for active downloads
- "Show seeding torrents" toggle in Settings Display (off by default); seeding items and filter tab hidden unless enabled
- "All Download Clients" link added to main nav bar and compact nav sheet

### Changed
- "All Queues" renamed to "All App Queues" across nav, page header, and page title

## [1.16.4] — 2026-04-26

### Added
- Refresh button re-added to the main nav bar; spins while refreshing and only appears on pages that support refresh (dashboard, queue views)

## [1.16.3] — 2026-04-26

### Fixed
- Instance card queue count now respects the "Hide pending downloads" setting; pending items are no longer counted when the setting is enabled, matching what is shown in the queue view

## [1.16.2] — 2026-04-26

### Fixed
- Compact nav sheet no longer visible behind iOS status bar or overlapping the trigger when closed; sheet is now clipped by an `overflow: hidden` container so it is fully invisible when slid off-screen

## [1.16.1] — 2026-04-26

### Changed
- Tablet mode dashboard background set to `#000`
- Compact nav trigger bar height increased to 15px with a lighter `#222` background
- 12px spacer added between the trigger bar and dashboard content for visual symmetry

## [1.16.0] — 2026-04-26

### Added
- Settings Apps and Download Clients lists are now drag-to-reorder; each row has a 6-dot handle on the left and a drop-target indicator on hover
- Drag order is persisted to localStorage and applied on the dashboard across all layout modes (standard, horizontal, tablet)

## [1.15.4] — 2026-04-26

### Changed
- Dashboard section headers ("Download Clients" / "Apps") now shown in horizontal layout mode as well; still hidden in tablet mode

## [1.15.3] — 2026-04-26

### Added
- Dashboard (standard mode): section headers "Download Clients" and "Apps" reinstated above each card group

## [1.15.2] — 2026-04-26

### Added
- Test mode banner now includes a "Disable" button to turn off test mode without going to Settings

## [1.15.1] — 2026-04-26

### Changed
- Removed right-side drawer and bottom-right FABs entirely
- Compact nav trigger moved to top of screen (fixed, full-width, 10px bar with down-chevron); panel now drops down from the trigger instead of sliding up from the bottom
- Compact nav shown on dashboard whenever "Dashboard nav bar" is disabled (any layout mode, not just tablet)
- Tablet layout heights converted from fixed `calc()` to flex-fill (`flex: 1; min-height: 0`) so the layout correctly fills the remaining space when AppNav or other elements are present

## [1.15.0] — 2026-04-26

### Added
- All Queues page: back button to return to the dashboard
- Display setting "Dashboard nav bar" (Layout zone) to show/hide the nav bar on the dashboard; on by default
- Dashboard: nav bar (logo + links) shown above all layouts when setting is enabled; tablet mode uses a flex wrapper so the cards still fill the remaining height
- Nav bar extracted to shared `AppNav` component used by both Settings and Dashboard
- Apps tab: SABnzbd and qBittorrent instances unified into a single "Download Clients" zone with a type picker in the add form

## [1.14.5] — 2026-04-26

### Added
- Version number shown in all nav menus (drawer, tablet bottom sheet, settings nav bar) as a link to the GitHub repo; injected at build time via Vite define

## [1.14.4] — 2026-04-26

### Changed
- Settings nav bar: reduced padding, smaller logo text (21px) and nav item text (15px), shorter divider
- Settings tabs: inactive tabs raised to `--text2`, font size 14px; active tab bold (600)

## [1.14.3] — 2026-04-26

### Changed
- Settings page nav bar and hidden FAB/drawer now apply regardless of tablet mode (always visible on settings page)

## [1.14.2] — 2026-04-26

### Changed
- Tablet mode: settings page now shows a persistent horizontal nav bar (logo + Dashboard / All Queues / Settings links) above the settings tabs; the bottom-sheet trigger and FAB/drawer are hidden on this page

## [1.14.1] — 2026-04-26

### Changed
- All settings tabs now use the mosaic tile layout (Apps: Instances / SABnzbd / qBittorrent; Account: Security / Account)
- Auto-refresh interval controls are now inline with the toggle label instead of wrapping below it

## [1.14.0] — 2026-04-26

### Changed
- Display settings reorganised into zoned tiles: Layout, View, and Developer — tiles sit side-by-side at 50% width on non-mobile screens and stack to full-width on mobile

## [1.13.2] — 2026-04-26

### Changed
- "Hide pending downloads" is now a configurable toggle in Display settings (off by default) rather than always-on; filters `delay`/`pending` status items from all queue views

## [1.13.1] — 2026-04-26

### Fixed
- Queue views: items with `delay` or `pending` status (future scheduled downloads) are now filtered out before display

## [1.13.0] — 2026-04-26

### Changed
- Auto-refresh interval is now configurable: number input + seconds/minutes/hours/days dropdown (default 30 minutes), persisted in localStorage

## [1.12.5] — 2026-04-25

### Fixed
- Brand colours corrected to match app logos: SABnzbd changed from purple to amber (`#ffb300`), Lidarr changed from lime green to forest green (`#2d9948`)

## [1.12.4] — 2026-04-25

### Changed
- All dashboard cards: coloured left border increased from 3px to 5px
- qBittorrent card: added coloured left border (matching qBittorrent brand colour) to match SABnzbd and instance cards

## [1.12.3] — 2026-04-25

### Changed
- Tablet mode: nav trigger chevron is now white and bolder

## [1.12.2] — 2026-04-25

### Changed
- Tablet mode: nav trigger bar shrunk to 10px high, full-width, no button styling — just a centred up-arrow icon; dashboard height adjusted to match

## [1.12.1] — 2026-04-25

### Changed
- qBittorrent card: "DOWNLOADS" label renamed to "QUEUE" to match other cards

## [1.12.0] — 2026-04-25

### Added
- Remote reload: "Reload all devices" button in Display settings sets a server-side trigger (persists 20s); all open clients poll every 10s and reload once when they detect it — works across different devices and browsers

## [1.11.5] — 2026-04-25

### Fixed
- Tablet mode: instance card logo and name now stacked vertically and centred, preventing long names from overflowing the column

## [1.11.4] — 2026-04-25

### Fixed
- Tablet mode: SABnzbd status chip filename truncates with ellipsis instead of wrapping

## [1.11.3] — 2026-04-25

### Changed
- Instance cards: "In Queue" label renamed to "Queue" globally
- Tablet mode: instance card stat values 48→43px, labels 18→13px, name 22px; body uses space-between to fix logo/name vertical alignment
- Tablet mode: qBittorrent speed text 34→28px, count numbers 44→36px, ETA 48→40px, labels reduced to reduce crowding
- Tablet mode: SABnzbd speed/ETA text 34→29px, queue number 48→44px, labels reduced

## [1.11.2] — 2026-04-25

### Changed
- Tablet mode: status chips moved inline next to the download client name in the header row; chips scaled up to 16px; all label/secondary text increased by 5px across download client and instance cards

## [1.11.1] — 2026-04-25

### Added
- Display settings: Reload button performs a full browser refresh; useful for manually refreshing the app from tablet mode

## [1.11.0] — 2026-04-25

### Added
- Tablet mode: display setting optimised for large-screen tablets (9.7"+ iPads); dashboard switches to 70/30 full-height layout with dynamically divided card heights, larger text throughout, doubled app icons, hidden version/open-link clutter, and a discreet bottom-sheet navigation replacing the FAB buttons

## [1.10.10] — 2026-04-25

### Added
- Display setting: Auto-refresh — reloads the page every 10 minutes when enabled; stored in localStorage (browser-local, not synced to server)

## [1.10.9] — 2026-04-24

### Fixed
- Browser tab no longer shows "Idle" when qBittorrent is downloading; "Idle" is now only shown when no download client is active

## [1.10.8] — 2026-04-24

### Changed
- Queue item warnings now appear on their own line below the meta row, showing the full warning text truncated with ellipsis; still clickable to see all messages in a modal

## [1.10.7] — 2026-04-24

### Fixed
- qBittorrent pause/resume now uses the correct API endpoints: `POST /api/v2/torrents/pause` with `hashes=all` (v4) falling back to `stop`/`start` (v5); the previous `pauseAll`/`stopAll` endpoints do not exist in the qBittorrent API

## [1.10.6] — 2026-04-24

### Changed
- SABnzbd queue items now show total download size in the meta row (both queue and history slots)
- qBittorrent torrent rows now show total size in the meta row
- Dashboard section headings ("Download Clients" / "Instances") removed

## [1.10.5] — 2026-04-24

### Changed
- Remove modal closes immediately on action and then force-refreshes the queue in the background
- All queue screens show the app logo before the instance name instead of a type chip; lsio chip removed
- SABnzbd and qBittorrent queue screens: Pause/Resume controls moved to the centre of the nav bar; filter chips remain on the right

## [1.10.4] — 2026-04-24

### Changed
- Dashboard horizontal layout columns changed from 40/60 to 50/50
- All stat box numbers (speed, ETA, counts, queue) unified at 20–22 px across both cards
- Download speeds rounded to nearest integer (no decimal) on both qBittorrent and SABnzbd
- ETA reformatted to "1h 32m" / "45m" / "34s" on both cards; SABnzbd ETA was previously a raw HH:MM:SS string
- qBittorrent count box labels changed to "DOWNLOADS" and "SEEDS"
- Download/upload arrow icons scaled up to match larger speed text

## [1.10.3] — 2026-04-24

### Changed
- qBittorrent speed box uses download/upload arrow icons instead of DL/UL text; speeds always shown as "0 KB/s" rather than a dash when zero
- qBittorrent count box replaced with two inline rows (large number + small label) for Downloading and Seeding counts
- SABnzbd download speed always shown (was hidden when not actively downloading); shows "0 KB/s" when idle; queue count shows 0 not a dash
- Stat box text is muted (var(--text3)) on both cards when the client is idle

## [1.10.2] — 2026-04-24

### Changed
- qBittorrent card speed box replaced with two larger lines ("2.4 MB/s DL" / "512 KB/s UL"), showing "— DL" / "— UL" when speed is zero
- SABnzbd card queue count shows "—" instead of 0 when the queue is empty; size-left sublabel hidden when queue is empty

## [1.10.1] — 2026-04-24

### Fixed
- qBittorrent Pause/Resume buttons now only appear when relevant: Pause shows when torrents are actively downloading or seeding; Resume shows only when paused torrents exist

## [1.10.0] — 2026-04-24

### Added
- qBittorrent support: add and manage qBittorrent instances in Settings → Apps; dashboard card shows global DL/UL speed, downloading/seeding counts, and ETA; dedicated queue page with All/Downloading/Seeding/Paused/Error filter tabs and global Pause All / Resume All controls; optional authentication (leave username/password blank for unauthenticated Web UI); v4 and v5 API compatibility; tab title includes qBittorrent download speed alongside SABnzbd

## [1.9.0] — 2026-04-24

### Added
- Horizontal Orientation toggle in Settings → Display tab: splits the dashboard into a 40% download clients column and a 60% instances column; instance cards switch to an inline layout with header info on the left and stat boxes on the right; collapses to single-column on screens narrower than 700 px; persists across reloads via localStorage

## [1.8.0] — 2026-04-24

### Changed
- Settings page split into three tabs: Apps (arr instances + SABnzbd), Account (password + sign out), Display (developer/test mode toggle)

## [1.7.1] — 2026-04-24

### Changed
- Top bar removed entirely; logo moved to the top of the slide-in nav drawer
- Refresh button moved to a floating button group in the bottom-right corner, sitting to the left of the hamburger button

## [1.7.0] — 2026-04-24

### Changed
- Navigation links (Dashboard, All Queues, Settings) moved out of the top bar into a floating slide-in drawer, opened and closed by a hamburger button fixed to the bottom-right corner
- Dashboard and all pages are now full-width — the 1100 px max-width container and the centred box-shadow boxing have been removed

## [1.6.17] — 2026-04-23

### Fixed
- Tab title queue count now only includes arr instances; SABnzbd slot count is excluded

## [1.6.16] — 2026-04-23

### Changed
- Browser tab title now shows `Idle` when SABnzbd is configured but nothing is downloading, paused, or processing

## [1.6.15] — 2026-04-23

### Fixed
- Browser tab title now shows `MB/s` instead of `M/s`

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
