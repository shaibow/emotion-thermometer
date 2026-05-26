// JWT session utilities using jsonwebtoken (CommonJS compatible).
// Sessions are stored in an HttpOnly cookie called "et_session".
const jwt = require("jsonwebtoken");

const COOKIE_NAME = "et_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

function signSession(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d", algorithm: "HS256" });
}

function verifySession(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key.trim(), decodeURIComponent(rest.join("="))];
    })
  );
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

function setSessionCookie(res, token) {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  const cookieParts = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${SESSION_MAX_AGE}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isProduction) cookieParts.push("Secure");
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
  );
}

module.exports = {
  signSession,
  verifySession,
  getSessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  COOKIE_NAME,
};
