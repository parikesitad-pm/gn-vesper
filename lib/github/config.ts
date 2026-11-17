export function githubSetup() {
  const required = ["APP_URL", "GITHUB_APP_SLUG", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_WEBHOOK_SECRET", "SESSION_SECRET", "TOKEN_ENCRYPTION_KEY"];
  const missing = required.filter(key => !process.env[key]?.trim());
  try { appOrigin(); } catch { missing.push("APP_URL (HTTPS or localhost required)"); }
  if (process.env.GITHUB_APP_SLUG && !/^[a-z0-9-]+$/.test(process.env.GITHUB_APP_SLUG)) missing.push("GITHUB_APP_SLUG (invalid app name)");
  if (process.env.VERCEL && !process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) missing.push("SESSION_SECRET (at least 32 characters)");
  if (process.env.TOKEN_ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY)) missing.push("TOKEN_ENCRYPTION_KEY (64 hex characters)");
  return { ready: missing.length === 0, missing, pushReady: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), storage: process.env.DATABASE_URL ? "postgres" : "local" };
}
export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("APP_URL must use HTTPS outside localhost.");
  return url.origin;
}
