import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  // Instances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instances (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      external_url TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE instances ADD COLUMN IF NOT EXISTS external_url TEXT;`);

  // Users table for auth
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Session table (managed by connect-pg-simple)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
  `);

  // Migrate instance type constraints
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instances_type_check' AND conrelid = 'instances'::regclass) THEN
        ALTER TABLE instances DROP CONSTRAINT instances_type_check;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instances_type_check_v2' AND conrelid = 'instances'::regclass) THEN
        ALTER TABLE instances DROP CONSTRAINT instances_type_check_v2;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instances_type_check_v3' AND conrelid = 'instances'::regclass) THEN
        ALTER TABLE instances DROP CONSTRAINT instances_type_check_v3;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instances_type_check_v4' AND conrelid = 'instances'::regclass) THEN
        ALTER TABLE instances DROP CONSTRAINT instances_type_check_v4;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'instances_type_check_v5' AND conrelid = 'instances'::regclass) THEN
        ALTER TABLE instances ADD CONSTRAINT instances_type_check_v5
          CHECK (type IN ('sonarr', 'radarr', 'lidarr', 'sportarr'));
      END IF;
    END $$;
  `);

  // SABnzbd instances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sabnzbd_instances (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // qBittorrent instances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qbittorrent_instances (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Database initialized');
}

export default pool;
