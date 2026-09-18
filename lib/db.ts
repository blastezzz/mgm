/**
 * One tiny Postgres interface with two drivers:
 *   • DATABASE_URL set  → Neon serverless (what runs on Vercel)
 *   • no DATABASE_URL   → PGlite, real Postgres compiled to WASM, stored in ./data
 *
 * The second one exists so `npm run dev` works with zero accounts and zero
 * services — same SQL dialect either way, so nothing can drift between them.
 */

export interface Query {
  text: string;
  params?: unknown[];
}

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs every statement in a single transaction. */
  batch(queries: Query[]): Promise<void>;
  /** Releases the connection. Only scripts need this; the server keeps it open. */
  close(): Promise<void>;
}

/** One statement per entry: neither driver accepts multi-command queries. */
const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS cases (
    id             TEXT PRIMARY KEY,
    created_at     BIGINT NOT NULL,
    updated_at     BIGINT NOT NULL,
    project_name   TEXT NOT NULL,
    ticker         TEXT,
    chain          TEXT NOT NULL DEFAULT 'arc',
    contract       TEXT NOT NULL,
    amount_usd     DOUBLE PRECISION NOT NULL,
    category       TEXT NOT NULL,
    story          TEXT NOT NULL,
    refund_wallet  TEXT NOT NULL,
    wallet_address TEXT NOT NULL DEFAULT '',
    signature      TEXT,
    signed_at      BIGINT,
    signed_nonce   TEXT,
    signed_site    TEXT,
    tx_hash        TEXT,
    evidence_url   TEXT,
    contact        TEXT,
    reporter       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    admin_note     TEXT,
    supports       INTEGER NOT NULL DEFAULT 0,
    views          INTEGER NOT NULL DEFAULT 0,
    author_hash    TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS proofs (
    id       BIGSERIAL PRIMARY KEY,
    case_id  TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    path     TEXT NOT NULL,
    name     TEXT,
    size     BIGINT,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS supports (
    case_id    TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    voter      TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (case_id, voter)
  )`,
  // single-use challenges for wallet signatures
  `CREATE TABLE IF NOT EXISTS nonces (
    nonce      TEXT PRIMARY KEY,
    address    TEXT NOT NULL,
    issued_at  BIGINT NOT NULL,
    used_at    BIGINT
  )`,
  "CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_cases_amount ON cases(amount_usd DESC)",
  "CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)",
  "CREATE INDEX IF NOT EXISTS idx_cases_wallet ON cases(wallet_address)",
  "CREATE INDEX IF NOT EXISTS idx_cases_contract ON cases(contract)",
  "CREATE INDEX IF NOT EXISTS idx_proofs_case ON proofs(case_id, position)",
  "CREATE INDEX IF NOT EXISTS idx_nonces_issued ON nonces(issued_at)",
];

/** Columns added after a release — Postgres applies these idempotently. */
const MIGRATIONS = [
  "ALTER TABLE cases ADD COLUMN IF NOT EXISTS wallet_address TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cases ADD COLUMN IF NOT EXISTS signature TEXT",
  "ALTER TABLE cases ADD COLUMN IF NOT EXISTS signed_at BIGINT",
  "ALTER TABLE cases ADD COLUMN IF NOT EXISTS signed_nonce TEXT",
  "ALTER TABLE cases ADD COLUMN IF NOT EXISTS signed_site TEXT",
];

async function neonDb(url: string): Promise<Db> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.query(text, params)) as T[];
    },
    async batch(queries: Query[]) {
      await sql.transaction(queries.map((q) => sql.query(q.text, (q.params ?? []) as never[])));
    },
    async close() {
      /* neon-http holds no socket */
    },
  };
}

async function pgliteDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const dir = process.env.MGM_DATA_DIR ?? path.join(process.cwd(), "data", "pgdata");
  await fs.mkdir(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params);
      return res.rows;
    },
    async batch(queries: Query[]) {
      await pg.transaction(async (tx) => {
        for (const q of queries) await tx.query(q.text, (q.params ?? []) as unknown[]);
      });
    },
    async close() {
      await pg.close();
    },
  };
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  // PGlite needs a writable disk, which serverless hosts do not have
  if (!url && process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres database (Vercel → Storage → Neon) and redeploy.",
    );
  }

  const db = url ? await neonDb(url) : await pgliteDb();
  for (const ddl of SCHEMA) await db.query(ddl);
  for (const m of MIGRATIONS) await db.query(m);
  return db;
}

// one connection (and one schema check) per process, reused across HMR reloads
const g = globalThis as unknown as { __mgmDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__mgmDb ??= connect();
  return g.__mgmDb;
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function batch(queries: Query[]): Promise<void> {
  return (await getDb()).batch(queries);
}

/** Scripts call this so the process can exit; the server never does. */
export async function closeDb(): Promise<void> {
  if (!g.__mgmDb) return;
  const db = await g.__mgmDb;
  g.__mgmDb = undefined;
  await db.close();
}

/** Postgres hands back BIGINT/NUMERIC as strings — normalise at the edge. */
export function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}
