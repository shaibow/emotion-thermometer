// GET  /api/logs        — fetch this user's emotion log history (up to 50 entries)
// POST /api/logs        — upsert an array of history entries for this user
// DELETE /api/logs/:id  — remove one entry (via query param ?id=...)
const { initSchema, getClient } = require("../lib/db");
const { getSessionFromRequest } = require("../lib/auth");

const MAX_ENTRIES = 50;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");

  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = session.sub;

  try {
    await initSchema();
    const db = getClient();

    if (req.method === "GET") {
      const page = (req.query && req.query.page) || "your-thermometer";
      const result = await db.execute({
        sql: `SELECT id, entry, saved_at FROM emotion_logs
              WHERE user_id = ? AND page = ?
              ORDER BY saved_at DESC
              LIMIT ${MAX_ENTRIES}`,
        args: [userId, page],
      });

      const entries = result.rows.map((row) => {
        try {
          return JSON.parse(row.entry);
        } catch {
          return null;
        }
      }).filter(Boolean);

      res.status(200).json({ entries });
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const entries = Array.isArray(body.entries) ? body.entries : [];
      const page = body.page || "your-thermometer";

      if (!entries.length) {
        res.status(400).json({ error: "entries array is required" });
        return;
      }

      // Upsert each entry (insert or replace by id)
      for (const entry of entries.slice(0, MAX_ENTRIES)) {
        if (!entry || !entry.id) continue;
        await db.execute({
          sql: `INSERT INTO emotion_logs (id, user_id, page, entry, saved_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET entry = excluded.entry, saved_at = excluded.saved_at`,
          args: [entry.id, userId, page, JSON.stringify(entry), entry.savedAt || new Date().toISOString()],
        });
      }

      // Enforce MAX_ENTRIES limit per user per page by deleting oldest excess entries
      await db.execute({
        sql: `DELETE FROM emotion_logs WHERE user_id = ? AND page = ?
              AND id NOT IN (
                SELECT id FROM emotion_logs
                WHERE user_id = ? AND page = ?
                ORDER BY saved_at DESC
                LIMIT ${MAX_ENTRIES}
              )`,
        args: [userId, page, userId, page],
      });

      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "DELETE") {
      const entryId = req.query && req.query.id;
      if (!entryId) {
        res.status(400).json({ error: "id query parameter is required" });
        return;
      }

      await db.execute({
        sql: "DELETE FROM emotion_logs WHERE id = ? AND user_id = ?",
        args: [entryId, userId],
      });

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Logs API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
