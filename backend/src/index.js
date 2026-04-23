import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import pool, { initDb } from './db/index.js';
import instancesRouter from './routes/instances.js';
import arrRouter from './routes/arr.js';
import authRouter from './routes/auth.js';
import sabnzbdRouter from './routes/sabnzbd.js';
import qbittorrentRouter from './routes/qbittorrent.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();
const PORT = process.env.PORT || 6767;
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicPath = join(__dirname, '../public');
const PgSession = connectPgSimple(session);

const SESSION_SECRET = process.env.SESSION_SECRET || 'arrmonitor-dev-secret-change-in-production';

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Session middleware — 30 day expiry, stored in Postgres
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: false, // we create it in initDb
  }),
  name: 'arrmonitor.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
  },
}));

// Auth routes — public (no requireAuth)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/instances', requireAuth, instancesRouter);
app.use('/api/arr', requireAuth, arrRouter);
app.use('/api/sabnzbd', requireAuth, sabnzbdRouter);
app.use('/api/qbittorrent', requireAuth, qbittorrentRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

// Serve frontend static files if they exist (production single-image build)
if (existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (_, res) => res.sendFile(join(publicPath, 'index.html')));
}

async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`Backend running on :${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
