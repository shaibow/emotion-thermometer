// Quick smoke test: connect to Turso and initialize schema.
require("dotenv").config({ path: ".env.local" });

const { initSchema, getClient } = require("../lib/db");

(async () => {
  console.log("Connecting to Turso...");
  console.log("  URL:", process.env.thermometer_TURSO_DATABASE_URL);
  await initSchema();
  console.log("Schema initialised ✓");

  const db = getClient();
  const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("Tables:", result.rows.map(r => r.name).join(", "));
  process.exit(0);
})().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
