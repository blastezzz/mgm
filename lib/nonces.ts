import { randomBytes } from "node:crypto";
import { num, query } from "./db";

/** A challenge is only good for ten minutes and only once. */
export const NONCE_TTL_MS = 10 * 60 * 1000;

export async function issueNonce(address: string): Promise<{ nonce: string; issuedAt: number }> {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  await query("INSERT INTO nonces (nonce, address, issued_at, used_at) VALUES ($1, $2, $3, NULL)", [
    nonce,
    address.toLowerCase(),
    issuedAt,
  ]);
  // opportunistic cleanup of long-expired challenges
  await query("DELETE FROM nonces WHERE issued_at < $1", [issuedAt - 24 * 60 * 60 * 1000]);
  return { nonce, issuedAt };
}

export type NonceCheck =
  | { ok: true; issuedAt: number }
  | { ok: false; reason: string };

/** Verifies a challenge and burns it in the same statement. */
export async function consumeNonce(nonce: string, address: string): Promise<NonceCheck> {
  const rows = await query<{ address: string; issued_at: string | number; used_at: string | number | null }>(
    "SELECT address, issued_at, used_at FROM nonces WHERE nonce = $1",
    [nonce],
  );
  const row = rows[0];

  if (!row) return { ok: false, reason: "Signature challenge not found — start over" };
  if (row.used_at !== null) return { ok: false, reason: "That signature was already used" };
  if (row.address !== address.toLowerCase()) return { ok: false, reason: "Signature challenge belongs to another wallet" };

  const issuedAt = num(row.issued_at);
  if (Date.now() - issuedAt > NONCE_TTL_MS) return { ok: false, reason: "Signature expired — sign again" };

  // atomic burn: only the first caller gets the row back
  const burned = await query<{ nonce: string }>(
    "UPDATE nonces SET used_at = $1 WHERE nonce = $2 AND used_at IS NULL RETURNING nonce",
    [Date.now(), nonce],
  );
  if (!burned.length) return { ok: false, reason: "That signature was already used" };

  return { ok: true, issuedAt };
}
