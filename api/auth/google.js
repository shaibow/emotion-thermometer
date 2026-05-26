// Redirect the browser to Google's OAuth 2.0 consent screen.
module.exports = function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured" });
    return;
  }

  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });

  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
