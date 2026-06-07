import { Router } from 'express';
import pool from '../db/index.js';

const router = Router();

const ALLOWED_KEYS = new Set([
  'gotify_url',
  'gotify_token',
]);

// GET /api/settings — returns all settings as { key: value }
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1)', [
      [...ALLOWED_KEYS],
    ]);
    const obj = {};
    for (const row of rows) obj[row.key] = row.value;
    res.json(obj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/settings — upsert key-value pairs
router.post('/', async (req, res) => {
  try {
    const entries = Object.entries(req.body).filter(([k]) => ALLOWED_KEYS.has(k));
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value)],
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/settings/test-gotify — send a test Gotify notification
router.post('/test-gotify', async (req, res) => {
  const { gotify_url, gotify_token } = req.body;
  if (!gotify_url || !gotify_token) {
    return res.status(400).json({ error: 'gotify_url and gotify_token are required' });
  }
  try {
    const r = await fetch(`${gotify_url.replace(/\/$/, '')}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gotify-Key': gotify_token,
      },
      body: JSON.stringify({
        title: 'arrmonitor — test notification',
        message: 'Gotify is connected and working.',
        priority: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: `Gotify responded ${r.status}: ${text.slice(0, 200)}` });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
