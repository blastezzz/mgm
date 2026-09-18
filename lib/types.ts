export type CaseStatus = "pending" | "reviewing" | "verified" | "refunded" | "rejected";

/** MGM only accepts claims against tokens launched on Arc. */
export type Chain = "arc";

export type Category =
  | "rug_pull" | "bad_team" | "honeypot" | "dev_dump"
  | "fake_partnership" | "liquidity_pulled" | "impersonation" | "other";

export interface Proof {
  id: number;
  path: string;
  name: string | null;
  size: number | null;
}

export interface RefundCase {
  id: string;
  createdAt: number;
  updatedAt: number;
  projectName: string;
  ticker: string | null;
  chain: Chain;
  contract: string;
  amountUsd: number;
  category: Category;
  story: string;
  /** Always the wallet that signed the claim. */
  refundWallet: string;
  walletAddress: string;
  signature: string | null;
  signedAt: number | null;
  signedNonce: string | null;
  signedSite: string | null;
  txHash: string | null;
  evidenceUrl: string | null;
  contact: string | null;
  reporter: string;
  status: CaseStatus;
  adminNote: string | null;
  supports: number;
  views: number;
  proofs: Proof[];
}

export interface Stats {
  totalCases: number;
  totalLost: number;
  totalRefunded: number;
  projectsFlagged: number;
  verifiedCases: number;
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  pending: "Awaiting review",
  reviewing: "Under review",
  verified: "Verified",
  refunded: "Refunded",
  rejected: "Rejected",
};

export const STATUS_ORDER: CaseStatus[] = ["pending", "reviewing", "verified", "refunded", "rejected"];

export const CHAIN_LABEL: Record<Chain, string> = { arc: "Arc" };

/** Optional — set NEXT_PUBLIC_ARC_EXPLORER to link contracts to an explorer. */
export const ARC_EXPLORER = process.env.NEXT_PUBLIC_ARC_EXPLORER ?? "";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "rug_pull",         label: "Rug pull" },
  { value: "liquidity_pulled", label: "Liquidity pulled" },
  { value: "bad_team",         label: "Bad / absent team" },
  { value: "dev_dump",         label: "Dev dumped supply" },
  { value: "honeypot",         label: "Honeypot" },
  { value: "fake_partnership", label: "Fake partnership" },
  { value: "impersonation",    label: "Impersonation / fake CA" },
  { value: "other",            label: "Other" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<Category, string>;

/** Support votes needed before a claim is escalated to manual review. */
export const SUPPORT_THRESHOLD = 100;
