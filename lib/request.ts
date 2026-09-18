import { fingerprint } from "./cases";

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "0.0.0.0";
}

export function visitorId(req: Request): string {
  return fingerprint(clientIp(req), req.headers.get("user-agent") ?? "");
}

export function isAdmin(req: Request): boolean {
  const key = process.env.MGM_ADMIN_KEY;
  if (!key) return false;
  const sent = req.headers.get("x-mgm-admin") ?? "";
  return sent.length === key.length && sent === key;
}
