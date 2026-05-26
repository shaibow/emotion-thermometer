// Returns the currently authenticated user, or 401 if not logged in.
const { getSessionFromRequest } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ user: null });
    return;
  }

  res.status(200).json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      avatar: session.avatar,
    },
  });
};
