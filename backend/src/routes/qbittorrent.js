import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// In-memory SID cache per instance. Cleared on 403 and re-authenticated.
const sidCache = new Map();

async function getInst(id) {
  const { rows } = await pool.query('SELECT * FROM qbittorrent_instances WHERE id = $1', [id]);
  if (!rows.length) throw new Error('Not found');
  return rows[0];
}

async function login(inst) {
  const base = inst.url.replace(/\/+$/, '');
  // No credentials — try unauthenticated
  if (!inst.username && !inst.password) {
    sidCache.set(inst.id, null);
    return null;
  }
  const body = new URLSearchParams();
  body.set('username', inst.username || '');
  body.set('password', inst.password || '');
  const res = await fetch(`${base}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  if (text.trim() === 'Fails.') throw new Error('qBittorrent login failed — check username and password');
  const cookie = res.headers.get('set-cookie') || '';
  const match = cookie.match(/SID=([^;]+)/);
  if (!match) {
    // Some builds skip the SID when auth is disabled but respond Ok.
    sidCache.set(inst.id, null);
    return null;
  }
  sidCache.set(inst.id, match[1]);
  return match[1];
}

async function getSid(inst) {
  if (sidCache.has(inst.id)) return sidCache.get(inst.id);
  return login(inst);
}

async function qbFetch(inst, path, options = {}) {
  const base = inst.url.replace(/\/+$/, '');
  let sid = await getSid(inst);
  const makeHeaders = (s) => {
    const h = { ...(options.headers || {}) };
    if (s) h['Cookie'] = `SID=${s}`;
    return h;
  };
  let res = await fetch(`${base}${path}`, {
    ...options,
    headers: makeHeaders(sid),
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 403) {
    sidCache.delete(inst.id);
    sid = await login(inst);
    res = await fetch(`${base}${path}`, {
      ...options,
      headers: makeHeaders(sid),
      signal: AbortSignal.timeout(10000),
    });
  }
  return res;
}

// ── CRUD ──────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, url, username, enabled, created_at FROM qbittorrent_instances ORDER BY id'
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, url, username, password } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  const cleanUrl = url.replace(/\/+$/, '');
  const { rows } = await pool.query(
    `INSERT INTO qbittorrent_instances (name, url, username, password)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, url, username, enabled, created_at`,
    [name.trim(), cleanUrl, (username || '').trim(), (password || '').trim()]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { name, url, username, password, enabled } = req.body;
  const { rows } = await pool.query(
    `UPDATE qbittorrent_instances SET
       name     = COALESCE($1, name),
       url      = COALESCE($2, url),
       username = COALESCE($3, username),
       password = COALESCE(NULLIF($4, '__keep__'), password),
       enabled  = COALESCE($5, enabled),
       updated_at = NOW()
     WHERE id = $6
     RETURNING id, name, url, username, enabled, created_at`,
    [
      name || null,
      url ? url.replace(/\/+$/, '') : null,
      username !== undefined ? username : null,
      password || '__keep__',
      enabled ?? null,
      req.params.id,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  sidCache.delete(parseInt(req.params.id));
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM qbittorrent_instances WHERE id = $1', [req.params.id]);
  sidCache.delete(parseInt(req.params.id));
  res.status(204).end();
});

// ── Proxy endpoints ───────────────────────────────────────────────

router.get('/:id/test', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    sidCache.delete(inst.id);
    await login(inst);
    const r = await qbFetch(inst, '/api/v2/app/version');
    if (!r.ok) throw new Error(`qBittorrent returned ${r.status}`);
    const version = await r.text();
    res.json({ ok: true, version: version.trim() });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.get('/:id/torrents', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const r = await qbFetch(inst, '/api/v2/torrents/info');
    if (!r.ok) throw new Error(`qBittorrent returned ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/:id/transfer', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const r = await qbFetch(inst, '/api/v2/transfer/info');
    if (!r.ok) throw new Error(`qBittorrent returned ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/pauseAll', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const formBody = 'hashes=all';
    const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
    // v4: pause, v5: stop
    let r = await qbFetch(inst, '/api/v2/torrents/pause', { method: 'POST', headers: formHeaders, body: formBody });
    if (r.status === 404) r = await qbFetch(inst, '/api/v2/torrents/stop', { method: 'POST', headers: formHeaders, body: formBody });
    if (!r.ok) throw new Error(`qBittorrent returned ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/resumeAll', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const formBody = 'hashes=all';
    const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
    // v4: resume, v5: start
    let r = await qbFetch(inst, '/api/v2/torrents/resume', { method: 'POST', headers: formHeaders, body: formBody });
    if (r.status === 404) r = await qbFetch(inst, '/api/v2/torrents/start', { method: 'POST', headers: formHeaders, body: formBody });
    if (!r.ok) throw new Error(`qBittorrent returned ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
