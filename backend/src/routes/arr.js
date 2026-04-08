import { Router } from 'express';
import fetch from 'node-fetch';
import pool from '../db/index.js';

const router = Router();

async function getInstance(id) {
  const { rows } = await pool.query('SELECT * FROM instances WHERE id = $1', [id]);
  return rows[0];
}

// API base per instance type
// Sportarr uses /api (its own native API — /api/v3 only has select compat endpoints, not queue)
function resolveApiBase(instance) {
  if (instance.type === 'lidarr') return '/api/v1';
  if (instance.type === 'sportarr') return '/api';
  return '/api/v3';
}

async function arrFetch(instance, apiPath, options = {}, retries = 2) {
  const apiBase = resolveApiBase(instance);
  const url = `${instance.url}${apiBase}${apiPath}`;
  const headers = {
    'X-Api-Key': instance.api_key,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(12000),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text();
        if (text.trimStart().startsWith('<')) {
          throw new Error(`Upstream ${res.status}: server returned HTML — check URL and API key`);
        }
        throw new Error(`Upstream ${res.status}: ${text}`);
      }
      if (!contentType.includes('application/json')) {
        const preview = (await res.text()).trimStart().slice(0, 40);
        if (preview.startsWith('<')) {
          throw new Error('Server returned HTML instead of JSON — check that the URL points to the API, not the web UI');
        }
      }
      return await res.json();
    } catch (e) {
      lastError = e;
      const isRetryable =
        e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' ||
        e.name === 'AbortError' || e.name === 'TimeoutError' ||
        (e.message && (e.message.includes('ECONNRESET') || e.message.includes('aborted')));
      if (!isRetryable || options.method === 'DELETE' || options.method === 'POST') break;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  const msg = lastError?.message || 'Unknown error';
  if (msg.includes('ECONNRESET'))   throw new Error('Connection reset — server may be busy');
  if (msg.includes('ECONNREFUSED')) throw new Error('Connection refused — is the instance running?');
  if (msg.includes('aborted') || lastError?.name === 'TimeoutError') throw new Error('Request timed out');
  throw lastError;
}

// GET LinuxServer.io image list — proxied to avoid CORS on the client
router.get('/lsio/images', async (req, res) => {
  try {
    const r = await fetch(
      'https://api.linuxserver.io/api/v1/images?include_config=false&include_deprecated=false',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return res.status(502).json({ error: `Upstream ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET queue
router.get('/:id/queue', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 50;

    let data;
    if (instance.type === 'sportarr') {
      // Sportarr native /api/queue returns a flat array, not a paginated object
      // Normalise it into the standard {page, totalRecords, records} shape
      const raw = await arrFetch(instance, `/queue`);
      const records = Array.isArray(raw) ? raw : (raw?.records || []);
      // Map Sportarr field names to Sonarr-compatible names for display
      const mapped = records.map(r => {
        const sportName = typeof r.sport === 'string' ? r.sport
          : (r.sport?.name || r.sport?.title || null);
        return {
          ...r,
          // Ensure status fields are always strings
          status: typeof r.status === 'string' ? r.status : String(r.status ?? 'queued'),
          trackedDownloadStatus: typeof r.trackedDownloadStatus === 'string' ? r.trackedDownloadStatus : '',
          trackedDownloadState: typeof r.trackedDownloadState === 'string' ? r.trackedDownloadState : '',
          // Map sport/event to series/episode for display
          series: r.series || (sportName ? { title: sportName } : null),
          episode: r.episode || (r.event && typeof r.event === 'object' ? {
            seasonNumber: r.event.seasonNumber ?? r.event.season ?? 0,
            episodeNumber: r.event.episodeNumber ?? r.event.episode ?? 0,
            title: typeof r.event.title === 'string' ? r.event.title : (r.event.name || ''),
          } : null),
          // sourceTitle must be a string
          title: typeof r.title === 'string' ? r.title : (r.sourceTitle || r.releaseTitle || ''),
        };
      });
      data = { page: 1, pageSize: mapped.length, totalRecords: mapped.length, records: mapped };
    } else {
      data = await arrFetch(instance, `/queue?page=${page}&pageSize=${pageSize}&includeUnknownSeriesItems=true&includeSeries=true&includeEpisode=true&includeMovie=true&includeArtist=true`);
    }

    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET history
router.get('/:id/history', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 30;
    const data = await arrFetch(instance, `/history?page=${page}&pageSize=${pageSize}&sortKey=date&sortDir=desc&includeSeries=true&includeEpisode=true`);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// DELETE queue item
router.delete('/:id/queue/:itemId', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const { blacklist = false, skipRedownload = false } = req.query;
    await arrFetch(instance, `/queue/${req.params.itemId}?blacklist=${blacklist}&skipRedownload=${skipRedownload}`, { method: 'DELETE' });
    res.status(204).end();
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// POST generic command
router.post('/:id/command', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const data = await arrFetch(instance, '/command', { method: 'POST', body: JSON.stringify(req.body) });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET manual import candidates for a queue item (uses the download path)
router.get('/:id/manualimport', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const { downloadId, folder } = req.query;
    const qs = new URLSearchParams();
    if (downloadId) qs.set('downloadId', downloadId);
    if (folder)     qs.set('folder', folder);
    if (req.query.filterExistingFiles) qs.set('filterExistingFiles', req.query.filterExistingFiles);
    const data = await arrFetch(instance, `/manualimport?${qs.toString()}`);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// POST manual import (confirm the import)
router.post('/:id/manualimport', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const importMode = req.query.importMode || 'move';
    const data = await arrFetch(instance, `/manualimport?importMode=${importMode}`, { method: 'POST', body: JSON.stringify(req.body) });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// GET system status — always returns 200 so the frontend can read ok:false gracefully
router.get('/:id/status', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const data = await arrFetch(instance, '/system/status');
    res.json({ ok: true, version: data.version, appName: data.appName, packageAuthor: data.packageAuthor || '' });
  } catch (e) {
    // Return 200 with ok:false so frontend can display the error message cleanly
    res.json({ ok: false, error: e.message });
  }
});

export default router;

// GET raw response for debugging
router.get('/:id/debug', async (req, res) => {
  try {
    const instance = await getInstance(req.params.id);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const resolvedBase = resolveApiBase(instance);
    const results = {};
    const basesToTest = instance.type === 'sportarr'
      ? ['/api', '/api/v3']
      : [resolvedBase];
    const pathsToTest = instance.type === 'sportarr'
      ? ['/system/status', '/queue']
      : ['/system/status', '/queue?page=1&pageSize=2'];

    for (const base of basesToTest) {
      for (const path of pathsToTest) {
        const url = `${instance.url}${base}${path}`;
        try {
          const r = await fetch(url, {
            headers: { 'X-Api-Key': instance.api_key },
            signal: AbortSignal.timeout(5000),
          });
          const ct = r.headers.get('content-type') || '';
          const text = await r.text();
          results[`${base}${path}`] = {
            status: r.status,
            contentType: ct,
            isJson: ct.includes('json') || (!text.trimStart().startsWith('<')),
            preview: text.slice(0, 1200),
          };
        } catch (e) {
          results[`${base}${path}`] = { error: e.message };
        }
      }
    }
    res.json({ type: instance.type, url: instance.url, resolvedBase, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
