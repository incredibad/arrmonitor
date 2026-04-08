import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/index.js';

const router = Router();

// Check if any user exists (for first-run detection)
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    const hasUsers = parseInt(rows[0].count) > 0;
    res.json({
      hasUsers,
      authenticated: !!req.session?.userId,
      username: req.session?.username || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// First-run: create the initial user
router.post('/setup', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) {
      return res.status(400).json({ error: 'Setup already complete' });
    }
    const { username, password } = req.body;
    if (!username?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: 'Username required and password must be at least 8 characters' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows: newRows } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username.trim(), hash]
    );
    req.session.userId = newRows[0].id;
    req.session.username = newRows[0].username;
    res.json({ ok: true, username: newRows[0].username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
    req.session.userId = rows[0].id;
    req.session.username = rows[0].username;
    res.json({ ok: true, username: rows[0].username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    res.clearCookie('arrmonitor.sid');
    res.json({ ok: true });
  });
});

// Change password (requires current session)
router.post('/change-password', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
