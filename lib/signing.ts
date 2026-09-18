/**
 * The exact text a claimant signs. Shared by the browser and the API so both
 * sides hash the same bytes — change it in one place or signatures stop matching.
 */
export interface ClaimChallenge {
  address: string;
  contract: string;
  amountUsd: number;
  proofCount: number;
  nonce: string;
  issuedAt: number;
  /** Domain shown in the signed text. Stored per claim so a rebrand or a domain
   *  move never invalidates signatures that were already collected. */
  site?: string;
}

export const SITE = "mgm.fund";

/** One parser for the amount field so both sides sign the same number. */
export function normalizeAmount(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[,\s$]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function claimMessage(c: ClaimChallenge): string {
  return [
    `${c.site ?? SITE} — refund claim`,
    "",
    "I am filing this refund claim as the owner of the wallet below.",
    "The screenshots attached are my own and the loss is mine.",
    "",
    `Wallet:    ${c.address.toLowerCase()}`,
    `Contract:  ${c.contract.toLowerCase()}`,
    `Loss:      $${c.amountUsd}`,
    `Proofs:    ${c.proofCount}`,
    `Nonce:     ${c.nonce}`,
    `Issued at: ${new Date(c.issuedAt).toISOString()}`,
    "",
    "Signing costs nothing and never moves funds.",
  ].join("\n");
}
