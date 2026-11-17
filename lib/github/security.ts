import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function encrypt(value: string, key = process.env.TOKEN_ENCRYPTION_KEY || "") {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("Configure TOKEN_ENCRYPTION_KEY.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}
export function decrypt(value: string, key = process.env.TOKEN_ENCRYPTION_KEY || "") {
  const [iv, tag, body] = value.split(".").map(part => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(body), cipher.final()]).toString("utf8");
}
export function verifyWebhook(body: string, signature: string | null, secret = process.env.GITHUB_WEBHOOK_SECRET || "") {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
export function signState(value: string) { return createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("base64url"); }
