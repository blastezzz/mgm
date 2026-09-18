import { randomBytes } from "node:crypto";
import { db } from "./db";

/** A challenge is only good for ten minutes and only once. */
export const NONCE_TTL_MS = 10 * 60 * 1000;

export function issueNonce(address: string): { nonce: string; issuedAt: number } {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  db.prepare("INSERT INTO nonces (nonce, address, issued_at, used_at) VALUES (?, ?, ?, NULL)")
    .run(nonce, address.toLowerCase(), issuedAt);
  // opportunistic cleanup of expired challenges
  db.prepare("DELETE FROM nonces WHERE issued_at < ?").run(issuedAt - 24 * 60 * 60 * 1000);
  return { nonce, issuedAt };
}

export type NonceCheck =
  | { ok: true; issuedAt: number }
  | { ok: false; reason: string };

/** Verifies a challenge and burns it in the same transaction. */
export function consumeNonce(nonce: string, address: string): NonceCheck {
  const row = db.prepare("SELECT * FROM nonces WHERE nonce = ?").get(nonce) as
    | { nonce: string; address: string; issued_at: number; used_at: number | null }
    | undefined;

  if (!row) return { ok: false, reason: "Signature challenge not found — start over" };
  if (row.used_at) return { ok: false, reason: "That signature was already used" };
  if (row.address !== address.toLowerCase()) return { ok: false, reason: "Signature challenge belongs to another wallet" };
  if (Date.now() - row.issued_at > NONCE_TTL_MS) return { ok: false, reason: "Signature expired — sign again" };

  const res = db.prepare("UPDATE nonces SET used_at = ? WHERE nonce = ? AND used_at IS NULL").run(Date.now(), nonce);
  if (!res.changes) return { ok: false, reason: "That signature was already used" };

  return { ok: true, issuedAt: row.issued_at };
}
