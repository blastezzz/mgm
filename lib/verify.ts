import "server-only";
import { verifyMessage } from "viem";
import { claimMessage } from "./signing";
import type { RefundCase } from "./types";

export type SignatureCheck =
  | { state: "valid"; address: string }
  | { state: "invalid"; reason: string }
  | { state: "unsigned" };

/**
 * Recomputes the signed message from what is stored and checks it against the
 * claimant's address — so anyone can re-audit a claim long after it was filed.
 */
export async function verifyClaim(c: RefundCase): Promise<SignatureCheck> {
  if (!c.signature || !c.signedNonce || !c.signedAt || !c.walletAddress) return { state: "unsigned" };

  const message = claimMessage({
    address: c.walletAddress,
    contract: c.contract,
    amountUsd: c.amountUsd,
    proofCount: c.proofs.length,
    nonce: c.signedNonce,
    issuedAt: c.signedAt,
    site: c.signedSite ?? undefined,
  });

  try {
    const ok = await verifyMessage({
      address: c.walletAddress as `0x${string}`,
      message,
      signature: c.signature as `0x${string}`,
    });
    return ok
      ? { state: "valid", address: c.walletAddress }
      : { state: "invalid", reason: "Signature does not match the claimant wallet" };
  } catch {
    return { state: "invalid", reason: "Signature could not be parsed" };
  }
}
