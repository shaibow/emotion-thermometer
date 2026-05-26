// Google OAuth callback — exchanges authorization code for user info, creates/updates
// the user record in Turso, issues a JWT session cookie, then redirects to the app.
const { initSchema, getClient } = require("../../lib/db");
const { signSession, setSessionCookie } = require("../../lib/auth");

function randomId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

module.exports = async function handler(req, res) {
  const { code, error } = req.query || {};

  if (error || !code) {
    const appUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    res.redirect(302, `${appUrl}/your-thermometer.html?auth=error`);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    // 2. Fetch user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!googleUser.id) {
      throw new Error("Failed to fetch Google user info");
    }

    // 3. Upsert user in database
    await initSchema();
    const db = getClient();

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE google_id = ?",
      args: [googleUser.id],
    });

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.execute({
        sql: "UPDATE users SET email = ?, name = ?, avatar = ? WHERE id = ?",
        args: [googleUser.email, googleUser.name || "", googleUser.picture || "", userId],
      });
    } else {
      userId = randomId();
      await db.execute({
        sql: "INSERT INTO users (id, google_id, email, name, avatar) VALUES (?, ?, ?, ?, ?)",
        args: [userId, googleUser.id, googleUser.email, googleUser.name || "", googleUser.picture || ""],
      });
    }

    // 4. Issue JWT session cookie
    const token = signSession({
      sub: userId,
      email: googleUser.email,
      name: googleUser.name || "",
      avatar: googleUser.picture || "",
    });

    setSessionCookie(res, token);
    res.redirect(302, `${baseUrl}/your-thermometer.html?auth=success`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    const appUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    res.redirect(302, `${appUrl}/your-thermometer.html?auth=error`);
  }
};
