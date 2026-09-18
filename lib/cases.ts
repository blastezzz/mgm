import { createHash, randomBytes } from "node:crypto";
import { batch, num, query } from "./db";
import type { Category, CaseStatus, Proof, RefundCase, Stats } from "./types";

export type SortKey = "trending" | "new" | "top" | "reviewing" | "refunded";

type Row = {
  id: string; created_at: string | number; updated_at: string | number; project_name: string;
  ticker: string | null; chain: string; contract: string; amount_usd: string | number;
  category: string; story: string; refund_wallet: string; wallet_address: string;
  signature: string | null; signed_at: string | number | null; signed_nonce: string | null;
  signed_site: string | null; tx_hash: string | null;
  evidence_url: string | null; contact: string | null; reporter: string;
  status: string; admin_note: string | null; supports: string | number; views: string | number;
};

function hydrate(row: Row, proofs: Proof[]): RefundCase {
  return {
    id: row.id,
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    projectName: row.project_name,
    ticker: row.ticker,
    chain: "arc",
    contract: row.contract,
    amountUsd: num(row.amount_usd),
    category: row.category as Category,
    story: row.story,
    refundWallet: row.refund_wallet,
    walletAddress: row.wallet_address,
    signature: row.signature,
    signedAt: row.signed_at === null ? null : num(row.signed_at),
    signedNonce: row.signed_nonce,
    signedSite: row.signed_site,
    txHash: row.tx_hash,
    evidenceUrl: row.evidence_url,
    contact: row.contact,
    reporter: row.reporter,
    status: row.status as CaseStatus,
    adminNote: row.admin_note,
    supports: num(row.supports),
    views: num(row.views),
    proofs,
  };
}

async function proofsFor(ids: string[]): Promise<Map<string, Proof[]>> {
  const map = new Map<string, Proof[]>();
  if (!ids.length) return map;
  const rows = await query<{ id: string | number; case_id: string; path: string; name: string | null; size: string | number | null }>(
    "SELECT id, case_id, path, name, size FROM proofs WHERE case_id = ANY($1) ORDER BY position ASC, id ASC",
    [ids],
  );
  for (const r of rows) {
    const list = map.get(r.case_id) ?? [];
    list.push({ id: num(r.id), path: r.path, name: r.name, size: r.size === null ? null : num(r.size) });
    map.set(r.case_id, list);
  }
  return map;
}

const ORDER: Record<SortKey, string> = {
  // hyperbolic decay: fresh claims with real backing float to the top
  trending: "(c.supports * 5.0 + c.views) / (1.0 + (EXTRACT(EPOCH FROM NOW()) - c.created_at / 1000.0) / 3600.0) DESC, c.created_at DESC",
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

export async function listCases(p: ListParams = {}): Promise<{ items: RefundCase[]; total: number; page: number; pages: number }> {
  const sort: SortKey = p.sort ?? "trending";
  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.max(p.page ?? 1, 1);

  const where: string[] = [];
  const args: unknown[] = [];
  const hole = () => `$${args.length}`;

  if (sort === "reviewing") where.push("c.status IN ('pending','reviewing')");
  else if (sort === "refunded") where.push("c.status = 'refunded'");

  if (p.status && p.status !== "all") { args.push(p.status); where.push(`c.status = ${hole()}`); }
  if (p.contract) { args.push(p.contract); where.push(`c.contract = ${hole()}`); }
  if (p.wallet) { args.push(p.wallet.toLowerCase()); where.push(`c.wallet_address = ${hole()}`); }

  const q = p.q?.trim();
  if (q) {
    args.push(`%${q}%`);
    const like = hole();
    where.push(
      `(c.project_name ILIKE ${like} OR c.ticker ILIKE ${like} OR c.contract ILIKE ${like}
        OR c.story ILIKE ${like} OR c.id ILIKE ${like} OR c.wallet_address ILIKE ${like})`,
    );
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const counted = await query<{ n: string | number }>(`SELECT COUNT(*) AS n FROM cases c ${clause}`, args);
  const total = num(counted[0]?.n);

  args.push(perPage, (page - 1) * perPage);
  const rows = await query<Row>(
    `SELECT c.* FROM cases c ${clause} ORDER BY ${ORDER[sort]} LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args,
  );

  const proofs = await proofsFor(rows.map((r) => r.id));
  return {
    items: rows.map((r) => hydrate(r, proofs.get(r.id) ?? [])),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getCase(id: string): Promise<RefundCase | null> {
  const rows = await query<Row>("SELECT * FROM cases WHERE id = $1", [id.toUpperCase()]);
  const row = rows[0];
  if (!row) return null;
  const proofs = await proofsFor([row.id]);
  return hydrate(row, proofs.get(row.id) ?? []);
}

export async function bumpViews(id: string): Promise<void> {
  await query("UPDATE cases SET views = views + 1 WHERE id = $1", [id.toUpperCase()]);
}

export async function getStats(): Promise<Stats> {
  const rows = await query<Record<string, string | number>>(
    `SELECT
        COUNT(*) AS "totalCases",
        COALESCE(SUM(amount_usd), 0) AS "totalLost",
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount_usd ELSE 0 END), 0) AS "totalRefunded",
        COUNT(DISTINCT contract) AS "projectsFlagged",
        COALESCE(SUM(CASE WHEN status IN ('verified','refunded') THEN 1 ELSE 0 END), 0) AS "verifiedCases"
      FROM cases`,
  );
  const r = rows[0] ?? {};
  return {
    totalCases: num(r.totalCases),
    totalLost: num(r.totalLost),
    totalRefunded: num(r.totalRefunded),
    projectsFlagged: num(r.projectsFlagged),
    verifiedCases: num(r.verifiedCases),
  };
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

export async function newCaseId(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const id = `MGM-${randomBytes(3).toString("hex").toUpperCase()}`;
    const hit = await query("SELECT 1 FROM cases WHERE id = $1", [id]);
    if (!hit.length) return id;
  }
  return `MGM-${Date.now().toString(36).toUpperCase()}`;
}

export async function createCase(input: NewCase): Promise<RefundCase> {
  const id = await newCaseId();
  const now = Date.now();
  const wallet = input.walletAddress.toLowerCase();

  await batch([
    {
      text: `INSERT INTO cases
        (id, created_at, updated_at, project_name, ticker, chain, contract, amount_usd, category,
         story, refund_wallet, wallet_address, signature, signed_at, signed_nonce, signed_site,
         tx_hash, evidence_url, contact, reporter, status, supports, views, author_hash)
        VALUES ($1, $2, $2, $3, $4, 'arc', $5, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, 'pending', 0, 0, $18)`,
      params: [
        id, now, input.projectName, input.ticker ?? null, input.contract, input.amountUsd,
        input.category, input.story, wallet, input.signature, input.signedAt, input.signedNonce,
        input.signedSite, input.txHash ?? null, input.evidenceUrl ?? null, input.contact ?? null,
        input.reporter, input.authorHash,
      ],
    },
    ...input.proofs.map((p, i) => ({
      text: "INSERT INTO proofs (case_id, path, name, size, position) VALUES ($1, $2, $3, $4, $5)",
      params: [id, p.path, p.name, p.size, i],
    })),
  ]);

  return (await getCase(id))!;
}

/** How many claims this author filed in the last `windowMs`. */
export async function recentCountByAuthor(authorHash: string, windowMs = 60 * 60 * 1000): Promise<number> {
  const rows = await query<{ n: string | number }>(
    "SELECT COUNT(*) AS n FROM cases WHERE author_hash = $1 AND created_at > $2",
    [authorHash, Date.now() - windowMs],
  );
  return num(rows[0]?.n);
}

/** How many claims this wallet filed in the last `windowMs`. */
export async function recentCountByWallet(wallet: string, windowMs = 60 * 60 * 1000): Promise<number> {
  const rows = await query<{ n: string | number }>(
    "SELECT COUNT(*) AS n FROM cases WHERE wallet_address = $1 AND created_at > $2",
    [wallet.toLowerCase(), Date.now() - windowMs],
  );
  return num(rows[0]?.n);
}

export async function setStatus(id: string, status: CaseStatus, adminNote?: string | null): Promise<RefundCase | null> {
  const rows = await query<{ id: string }>(
    "UPDATE cases SET status = $1, admin_note = COALESCE($2, admin_note), updated_at = $3 WHERE id = $4 RETURNING id",
    [status, adminNote ?? null, Date.now(), id.toUpperCase()],
  );
  if (!rows.length) return null;
  return getCase(id);
}

export async function deleteCase(id: string): Promise<string[]> {
  const key = id.toUpperCase();
  const paths = (await query<{ path: string }>("SELECT path FROM proofs WHERE case_id = $1", [key])).map((p) => p.path);
  await query("DELETE FROM cases WHERE id = $1", [key]);
  return paths;
}

export async function addSupport(id: string, voter: string): Promise<{ ok: boolean; supports: number; already: boolean }> {
  const key = id.toUpperCase();
  // one statement: insert the vote if it is new, and bump the counter only then
  const rows = await query<{ supports: string | number; inserted: boolean }>(
    `WITH ins AS (
       INSERT INTO supports (case_id, voter, created_at)
       SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM cases WHERE id = $1)
       ON CONFLICT (case_id, voter) DO NOTHING
       RETURNING 1
     ), bumped AS (
       UPDATE cases SET supports = supports + 1
       WHERE id = $1 AND EXISTS (SELECT 1 FROM ins)
       RETURNING supports
     )
     SELECT COALESCE((SELECT supports FROM bumped), (SELECT supports FROM cases WHERE id = $1)) AS supports,
            EXISTS (SELECT 1 FROM ins) AS inserted`,
    [key, voter, Date.now()],
  );

  const row = rows[0];
  if (!row || row.supports === null) return { ok: false, supports: 0, already: false };
  return { ok: true, supports: num(row.supports), already: !row.inserted };
}

const SALT = process.env.MGM_SALT ?? "mgm-local-salt";

/** Stable, non-reversible id for a visitor — used for vote dedupe and rate limits. */
export function fingerprint(ip: string, ua: string): string {
  return createHash("sha256").update(`${ip}|${ua}|${SALT}`).digest("hex").slice(0, 32);
}
