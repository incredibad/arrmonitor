import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

async function sabFetch(inst, mode, extra = {}) {
  const url = new URL(`${inst.url}/api`);
  url.searchParams.set('apikey', inst.api_key);
  url.searchParams.set('output', 'json');
  url.searchParams.set('mode', mode);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`SABnzbd returned ${res.status}`);
  const data = await res.json();
  if (data.status === false) throw new Error(data.error || 'SABnzbd error');
  return data;
}

async function getInst(id) {
  const { rows } = await pool.query('SELECT * FROM sabnzbd_instances WHERE id = $1', [id]);
  if (!rows.length) throw new Error('Not found');
  return rows[0];
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, url, enabled, created_at FROM sabnzbd_instances ORDER BY id');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, url, api_key } = req.body;
  if (!name || !url || !api_key) return res.status(400).json({ error: 'name, url and api_key required' });
  const cleanUrl = url.replace(/\/+$/, '');
  const { rows } = await pool.query(
    'INSERT INTO sabnzbd_instances (name, url, api_key) VALUES ($1, $2, $3) RETURNING id, name, url, enabled, created_at',
    [name.trim(), cleanUrl, api_key.trim()]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { name, url, api_key, enabled } = req.body;
  const { rows } = await pool.query(
    `UPDATE sabnzbd_instances SET
       name    = COALESCE($1, name),
       url     = COALESCE($2, url),
       api_key = COALESCE(NULLIF($3, ''), api_key),
       enabled = COALESCE($4, enabled),
       updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, url, enabled, created_at`,
    [name || null, url ? url.replace(/\/+$/, '') : null, api_key || '', enabled ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM sabnzbd_instances WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

router.get('/:id/test', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const data = await sabFetch(inst, 'version');
    res.json({ ok: true, version: data.version });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.get('/:id/queue', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const data = await sabFetch(inst, 'queue');
    res.json(data.queue);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    const data = await sabFetch(inst, 'history', { start: 0, limit: 50 });
    const PROCESSING = ['Extracting', 'Moving', 'Repairing', 'Verifying', 'Running'];
    const slots = (data.history?.slots || []).filter(s => PROCESSING.includes(s.status));
    res.json(slots);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    await sabFetch(inst, 'pause');
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    const inst = await getInst(req.params.id);
    await sabFetch(inst, 'resume');
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/pausefor', async (req, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes) return res.status(400).json({ error: 'minutes required' });
    const inst = await getInst(req.params.id);
    await sabFetch(inst, 'set_config', { section: 'misc', keyword: 'pause_int', value: minutes });
    await sabFetch(inst, 'pause');
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
