// Clears the session cookie and redirects to the app.
const { clearSessionCookie } = require("../../lib/auth");

module.exports = function handler(req, res) {
  clearSessionCookie(res);
  const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  res.redirect(302, `${baseUrl}/your-thermometer.html`);
};
