import fetch from 'node-fetch';
import pool from '../db/index.js';

const INTERVAL_MS = parseInt(process.env.NOTIFY_INTERVAL_MS || '60000', 10);

// Map<instanceId, Set<queueItemId>>
const seenErrors = new Map();

function isErrorItem(item) {
  const s = v => (typeof v === 'string' ? v : String(v ?? '')).toLowerCase();
  const tStatus = s(item.trackedDownloadStatus);
  const tState  = s(item.trackedDownloadState);
  const status  = s(item.status);
  return (
    tStatus === 'warning' || tStatus === 'error' ||
    status === 'failed' || tState === 'failed' || tState === 'failedpending'
  );
}

function getMediaTitle(item) {
  return (
    item.series?.title ||
    item.movie?.title ||
    item.artist?.artistName ||
    item.title ||
    item.sourceTitle ||
    'Unknown'
  );
}

function getErrorText(item) {
  const msgs = item.statusMessages || [];
  const parts = [];
  for (const m of msgs) {
    if (m.title) parts.push(m.title);
    if (Array.isArray(m.messages)) parts.push(...m.messages.filter(Boolean));
  }
  if (parts.length) return parts.join('\n');
  return item.trackedDownloadStatus || item.status || 'Error';
}

function resolveApiBase(type) {
  if (type === 'lidarr') return '/api/v1';
  if (type === 'sportarr') return '/api';
  return '/api/v3';
}

async function fetchQueueForInstance(instance) {
  const apiBase = resolveApiBase(instance.type);
  const url = `${instance.url}${apiBase}/queue?page=1&pageSize=100&includeUnknownSeriesItems=true&includeSeries=true&includeMovie=true&includeArtist=true`;
  const r = await fetch(url, {
    headers: { 'X-Api-Key': instance.api_key },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data?.records || []);
}

async function loadSettings() {
  const { rows } = await pool.query(
    "SELECT key, value FROM settings WHERE key IN ('gotify_url', 'gotify_token', 'app_base_url')",
  );
  const obj = {};
  for (const row of rows) obj[row.key] = row.value;
  return obj;
}

async function sendGotifyNotification(settings, instance, item) {
  const { gotify_url, gotify_token, app_base_url } = settings;
  const instanceUrl = (instance.external_url || instance.url).replace(/\/$/, '');
  const clickUrl = `${instanceUrl}/activity/queue`;

  const typeName = instance.type.charAt(0).toUpperCase() + instance.type.slice(1);
  const title = `⚠️ ${typeName} — ${instance.name}`;
  const mediaTitle = getMediaTitle(item);
  const errorText = getErrorText(item);
  const message = `${mediaTitle}\n${errorText}`;

  const extras = {
    'client::notification': {
      click: { url: clickUrl },
    },
  };

  if (app_base_url) {
    const base = app_base_url.replace(/\/$/, '');
    extras['client::notification'].bigImageUrl = `${base}/logos/${instance.type}.png`;
  }

  const r = await fetch(`${gotify_url.replace(/\/$/, '')}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gotify-Key': gotify_token,
    },
    body: JSON.stringify({ title, message, priority: 7, extras }),
    signal: AbortSignal.timeout(10000),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Gotify ${r.status}: ${text.slice(0, 200)}`);
  }
}

async function poll() {
  try {
    const settings = await loadSettings();
    if (!settings.gotify_url || !settings.gotify_token) return;

    const { rows: instances } = await pool.query(
      'SELECT * FROM instances WHERE enabled = true',
    );

    for (const instance of instances) {
      const instKey = String(instance.id);
      try {
        const records = await fetchQueueForInstance(instance);
        const errorItems = records.filter(isErrorItem);
        const errorIds = new Set(errorItems.map(i => String(i.id)));

        const seen = seenErrors.get(instKey) || new Set();

        for (const item of errorItems) {
          const itemId = String(item.id);
          if (!seen.has(itemId)) {
            try {
              await sendGotifyNotification(settings, instance, item);
            } catch (e) {
              console.error(`[errorMonitor] Gotify send failed for instance ${instance.name}:`, e.message);
            }
            seen.add(itemId);
          }
        }

        // Prune resolved errors so they can re-trigger if they recur
        for (const id of [...seen]) {
          if (!errorIds.has(id)) seen.delete(id);
        }

        seenErrors.set(instKey, seen);
      } catch (e) {
        // Connection errors are expected when an instance is offline
      }
    }
  } catch (e) {
    console.error('[errorMonitor] poll error:', e.message);
  }
}

export function startErrorMonitor() {
  poll();
  setInterval(poll, INTERVAL_MS);
  console.log(`[errorMonitor] started — polling every ${INTERVAL_MS / 1000}s`);
}
