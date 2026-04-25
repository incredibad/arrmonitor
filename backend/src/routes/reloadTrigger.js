import express from 'express';
import pool from '../db/index.js';

const router = express.Router();
const WINDOW_MS = 20000;

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT triggered_at FROM reload_trigger WHERE id = 1');
    const triggered_at = result.rows[0]?.triggered_at;
    if (!triggered_at) return res.json({ triggered: false, triggered_at: null });
    const age = Date.now() - new Date(triggered_at).getTime();
    res.json({ triggered: age < WINDOW_MS, triggered_at: triggered_at.toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await pool.query('UPDATE reload_trigger SET triggered_at = NOW() WHERE id = 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
