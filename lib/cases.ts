import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import type { Category, CaseStatus, Proof, RefundCase, Stats } from "./types";

export type SortKey = "trending" | "new" | "top" | "reviewing" | "refunded";

type Row = {
  id: string; created_at: number; updated_at: number; project_name: string;
  ticker: string | null; chain: string; contract: string; amount_usd: number;
  category: string; story: string; refund_wallet: string; wallet_address: string;
  signature: string | null; signed_at: number | null; signed_nonce: string | null; signed_site: string | null; tx_hash: string | null;
  evidence_url: string | null; contact: string | null; reporter: string;
  status: string; admin_note: string | null; supports: number; views: number;
};

function hydrate(row: Row, proofs: Proof[]): RefundCase {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projectName: row.project_name,
    ticker: row.ticker,
    chain: "arc",
    contract: row.contract,
    amountUsd: row.amount_usd,
    category: row.category as Category,
    story: row.story,
    refundWallet: row.refund_wallet,
    walletAddress: row.wallet_address,
    signature: row.signature,
    signedAt: row.signed_at,
    signedNonce: row.signed_nonce,
    signedSite: row.signed_site,
    txHash: row.tx_hash,
    evidenceUrl: row.evidence_url,
    contact: row.contact,
    reporter: row.reporter,
    status: row.status as CaseStatus,
    adminNote: row.admin_note,
    supports: row.supports,
    views: row.views,
    proofs,
  };
}

function proofsFor(ids: string[]): Map<string, Proof[]> {
  const map = new Map<string, Proof[]>();
  if (!ids.length) return map;
  const holes = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT id, case_id, path, name, size FROM proofs WHERE case_id IN (${holes}) ORDER BY position ASC, id ASC`)
    .all(...ids) as (Proof & { case_id: string })[];
  for (const r of rows) {
    const list = map.get(r.case_id) ?? [];
    list.push({ id: r.id, path: r.path, name: r.name, size: r.size });
    map.set(r.case_id, list);
  }
  return map;
}

const ORDER: Record<SortKey, string> = {
  // hyperbolic decay: fresh claims with real backing float to the top
  trending: "(c.supports * 5.0 + c.views) / (1.0 + (strftime('%s','now') - c.created_at / 1000) / 3600.0) DESC, c.created_at DESC",
  new: "c.created_at DESC",
  top: "c.amount_usd DESC, c.created_at DESC",
  reviewing: "c.created_at DESC",
  refunded: "c.updated_at DESC",
};

export interface ListParams {
  sort?: SortKey;
  q?: string;
  status?: CaseStatus | "all";
  /** Exact contract match — used for "other claims against this contract". */
  contract?: string;
  /** Every claim filed by one wallet. */
  wallet?: string;
  page?: number;
  perPage?: number;
}

export function listCases(p: ListParams = {}): { items: RefundCase[]; total: number; page: number; pages: number } {
  const sort: SortKey = p.sort ?? "trending";
  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.max(p.page ?? 1, 1);

  const where: string[] = [];
  const args: unknown[] = [];

  if (sort === "reviewing") where.push("c.status IN ('pending','reviewing')");
  else if (sort === "refunded") where.push("c.status = 'refunded'");

  if (p.status && p.status !== "all") { where.push("c.status = ?"); args.push(p.status); }
  if (p.contract) { where.push("c.contract = ?"); args.push(p.contract); }
  if (p.wallet) { where.push("c.wallet_address = ?"); args.push(p.wallet.toLowerCase()); }

  const q = p.q?.trim();
  if (q) {
    where.push("(c.project_name LIKE ? OR c.ticker LIKE ? OR c.contract LIKE ? OR c.story LIKE ? OR c.id LIKE ? OR c.wallet_address LIKE ?)");
    const like = `%${q}%`;
    args.push(like, like, like, like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM cases c ${clause}`).get(...args) as { n: number }).n;
  const rows = db
    .prepare(`SELECT c.* FROM cases c ${clause} ORDER BY ${ORDER[sort]} LIMIT ? OFFSET ?`)
    .all(...args, perPage, (page - 1) * perPage) as Row[];

  const proofs = proofsFor(rows.map((r) => r.id));
  return {
    items: rows.map((r) => hydrate(r, proofs.get(r.id) ?? [])),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export function getCase(id: string): RefundCase | null {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id.toUpperCase()) as Row | undefined;
  if (!row) return null;
  return hydrate(row, proofsFor([row.id]).get(row.id) ?? []);
}

export function bumpViews(id: string): void {
  db.prepare("UPDATE cases SET views = views + 1 WHERE id = ?").run(id.toUpperCase());
}

export function getStats(): Stats {
  return db
    .prepare(`SELECT
        COUNT(*) AS totalCases,
        COALESCE(SUM(amount_usd), 0) AS totalLost,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount_usd ELSE 0 END), 0) AS totalRefunded,
        COUNT(DISTINCT contract) AS projectsFlagged,
        COALESCE(SUM(CASE WHEN status IN ('verified','refunded') THEN 1 ELSE 0 END), 0) AS verifiedCases
      FROM cases`)
    .get() as Stats;
}

export interface NewCase {
  projectName: string;
  ticker?: string | null;
  contract: string;
  amountUsd: number;
  category: Category;
  story: string;
  walletAddress: string;
  signature: string;
  signedAt: number;
  signedNonce: string;
  signedSite: string;
  txHash?: string | null;
  evidenceUrl?: string | null;
  contact?: string | null;
  reporter: string;
  authorHash: string;
  proofs: { path: string; name: string | null; size: number | null }[];
}

export function newCaseId(): string {
  for (let i = 0; i < 12; i++) {
    const id = `MGM-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!db.prepare("SELECT 1 FROM cases WHERE id = ?").get(id)) return id;
  }
  return `MGM-${Date.now().toString(36).toUpperCase()}`;
}

export function createCase(input: NewCase): RefundCase {
  const id = newCaseId();
  const now = Date.now();
  const wallet = input.walletAddress.toLowerCase();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO cases
      (id, created_at, updated_at, project_name, ticker, chain, contract, amount_usd, category,
       story, refund_wallet, wallet_address, signature, signed_at, signed_nonce, signed_site, tx_hash,
       evidence_url, contact, reporter, status, supports, views, author_hash)
      VALUES (@id, @now, @now, @projectName, @ticker, 'arc', @contract, @amountUsd, @category,
       @story, @wallet, @wallet, @signature, @signedAt, @signedNonce, @signedSite, @txHash,
       @evidenceUrl, @contact, @reporter, 'pending', 0, 0, @authorHash)`)
      .run({
        id, now,
        projectName: input.projectName,
        ticker: input.ticker ?? null,
        contract: input.contract,
        amountUsd: input.amountUsd,
        category: input.category,
        story: input.story,
        wallet,
        signature: input.signature,
        signedAt: input.signedAt,
        signedNonce: input.signedNonce,
        signedSite: input.signedSite,
        txHash: input.txHash ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        contact: input.contact ?? null,
        reporter: input.reporter,
        authorHash: input.authorHash,
      });
    const ins = db.prepare("INSERT INTO proofs (case_id, path, name, size, position) VALUES (?, ?, ?, ?, ?)");
    input.proofs.forEach((p, i) => ins.run(id, p.path, p.name, p.size, i));
  });
  tx();
  return getCase(id)!;
}

/** How many claims this author filed in the last `windowMs`. */
export function recentCountByAuthor(authorHash: string, windowMs = 60 * 60 * 1000): number {
  const r = db
    .prepare("SELECT COUNT(*) AS n FROM cases WHERE author_hash = ? AND created_at > ?")
    .get(authorHash, Date.now() - windowMs) as { n: number };
  return r.n;
}

/** How many claims this wallet filed in the last `windowMs`. */
export function recentCountByWallet(wallet: string, windowMs = 60 * 60 * 1000): number {
  const r = db
    .prepare("SELECT COUNT(*) AS n FROM cases WHERE wallet_address = ? AND created_at > ?")
    .get(wallet.toLowerCase(), Date.now() - windowMs) as { n: number };
  return r.n;
}

export function setStatus(id: string, status: CaseStatus, adminNote?: string | null): RefundCase | null {
  const res = db
    .prepare("UPDATE cases SET status = ?, admin_note = COALESCE(?, admin_note), updated_at = ? WHERE id = ?")
    .run(status, adminNote ?? null, Date.now(), id.toUpperCase());
  if (!res.changes) return null;
  return getCase(id);
}

export function deleteCase(id: string): string[] {
  const paths = (db.prepare("SELECT path FROM proofs WHERE case_id = ?").all(id.toUpperCase()) as { path: string }[]).map((p) => p.path);
  db.prepare("DELETE FROM cases WHERE id = ?").run(id.toUpperCase());
  return paths;
}

export function addSupport(id: string, voter: string): { ok: boolean; supports: number; already: boolean } {
  const key = id.toUpperCase();
  if (!db.prepare("SELECT 1 FROM cases WHERE id = ?").get(key)) return { ok: false, supports: 0, already: false };
  if (db.prepare("SELECT 1 FROM supports WHERE case_id = ? AND voter = ?").get(key, voter)) {
    const c = db.prepare("SELECT supports FROM cases WHERE id = ?").get(key) as { supports: number };
    return { ok: true, supports: c.supports, already: true };
  }
  db.transaction(() => {
    db.prepare("INSERT INTO supports (case_id, voter, created_at) VALUES (?, ?, ?)").run(key, voter, Date.now());
    db.prepare("UPDATE cases SET supports = supports + 1 WHERE id = ?").run(key);
  })();
  const c = db.prepare("SELECT supports FROM cases WHERE id = ?").get(key) as { supports: number };
  return { ok: true, supports: c.supports, already: false };
}

const SALT = process.env.MGM_SALT ?? "mgm-local-salt";

/** Stable, non-reversible id for a visitor — used for vote dedupe and rate limits. */
export function fingerprint(ip: string, ua: string): string {
  return createHash("sha256").update(`${ip}|${ua}|${SALT}`).digest("hex").slice(0, 32);
}
