import { Router } from 'express';
import pool from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM instances ORDER BY created_at ASC');
    const masked = rows.map(r => ({
      ...r,
      api_key: r.api_key.slice(0, 4) + '****' + r.api_key.slice(-4)
    }));
    res.json(masked);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, type, url, api_key, external_url } = req.body;
  if (!name || !type || !url || !api_key) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO instances (name, type, url, api_key, external_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, type, url.replace(/\/$/, ''), api_key, external_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, type, url, api_key, external_url, enabled } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE instances SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        url = COALESCE($3, url),
        api_key = COALESCE($4, api_key),
        external_url = $5,
        enabled = COALESCE($6, enabled),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, type, url, api_key || null, external_url !== undefined ? (external_url || null) : undefined, enabled, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/logo', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT url FROM instances WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).end();
    const logoUrl = `${rows[0].url}/Content/Images/logo.png`;
    const upstream = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) return res.status(404).end();
    const ct = upstream.headers.get('content-type') || 'image/png';
    const buf = await upstream.arrayBuffer();
    res.setHeader('content-type', ct);
    res.setHeader('cache-control', 'public, max-age=86400');
    res.send(Buffer.from(buf));
  } catch {
    res.status(404).end();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM instances WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
