import { CATEGORIES, type Category } from "./types";

export const LIMITS = {
  projectName: 64,
  ticker: 16,
  contract: 128,
  story: 4000,
  storyMin: 60,
  wallet: 128,
  txHash: 160,
  url: 300,
  contact: 64,
  reporter: 32,
  amountMax: 500_000_000,
  proofsMax: 5,
  proofBytes: 6 * 1024 * 1024,
};

/** Arc is EVM-compatible, so contracts and wallets are 0x-prefixed 20-byte addresses. */
export const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export type Draft = {
  projectName: string;
  ticker: string;
  contract: string;
  amountUsd: string | number;
  category: string;
  story: string;
  txHash: string;
  evidenceUrl: string;
  contact: string;
  reporter: string;
  confirmed: boolean;
  proofCount: number;
  walletAddress: string;
};

export type Errors = Partial<Record<keyof Draft, string>>;

export function validateDraft(d: Draft): Errors {
  const e: Errors = {};
  const name = d.projectName?.trim() ?? "";
  if (name.length < 2) e.projectName = "Enter the token or project name";
  else if (name.length > LIMITS.projectName) e.projectName = `Max ${LIMITS.projectName} characters`;

  if (d.ticker && d.ticker.trim().length > LIMITS.ticker) e.ticker = `Max ${LIMITS.ticker} characters`;

  const ca = d.contract?.trim() ?? "";
  if (!ca) e.contract = "Contract address is required";
  else if (!ADDRESS.test(ca)) e.contract = "Expected an Arc address — 0x followed by 40 hex characters";

  const amount = typeof d.amountUsd === "number" ? d.amountUsd : Number(String(d.amountUsd).replace(/[,\s$]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) e.amountUsd = "Enter the amount you lost in USD";
  else if (amount > LIMITS.amountMax) e.amountUsd = "That amount is out of range";

  if (!CATEGORIES.some((c) => c.value === (d.category as Category))) e.category = "Pick what happened";

  const story = d.story?.trim() ?? "";
  if (story.length < LIMITS.storyMin) e.story = `Describe what happened — at least ${LIMITS.storyMin} characters`;
  else if (story.length > LIMITS.story) e.story = `Max ${LIMITS.story} characters`;

  if (!d.walletAddress) e.walletAddress = "Connect the wallet that took the loss";
  else if (!ADDRESS.test(d.walletAddress)) e.walletAddress = "That wallet address is not valid";

  if (d.txHash && d.txHash.trim().length > LIMITS.txHash) e.txHash = "That hash is too long";

  const url = d.evidenceUrl?.trim();
  if (url) {
    if (url.length > LIMITS.url) e.evidenceUrl = "That link is too long";
    else if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) e.evidenceUrl = "Enter a full link starting with https://";
  }

  if (d.contact && d.contact.trim().length > LIMITS.contact) e.contact = `Max ${LIMITS.contact} characters`;

  const reporter = d.reporter?.trim() ?? "";
  if (reporter.length > LIMITS.reporter) e.reporter = `Max ${LIMITS.reporter} characters`;

  if (!d.proofCount) e.proofCount = "At least one screenshot is required";
  else if (d.proofCount > LIMITS.proofsMax) e.proofCount = `Up to ${LIMITS.proofsMax} screenshots`;

  if (!d.confirmed) e.confirmed = "Confirm that your report is truthful";

  return e;
}

export function explorerUrl(contract: string): string | null {
  const base = process.env.NEXT_PUBLIC_ARC_EXPLORER;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/address/${contract}`;
}
