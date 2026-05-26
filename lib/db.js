// Turso (libSQL) client + schema initialization.
// Env vars are named with the project prefix by the Vercel Turso integration.
const { createClient } = require("@libsql/client");

let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.thermometer_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const authToken = process.env.thermometer_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    _client = createClient({ url, authToken });
  }
  return _client;
}

async function initSchema() {
  const db = getClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      google_id   TEXT UNIQUE NOT NULL,
      email       TEXT NOT NULL,
      name        TEXT,
      avatar      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emotion_logs (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page       TEXT NOT NULL DEFAULT 'your-thermometer',
      entry      TEXT NOT NULL,
      saved_at   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_emotion_logs_user ON emotion_logs(user_id, saved_at DESC);
  `);
}

module.exports = { getClient, initSchema };
