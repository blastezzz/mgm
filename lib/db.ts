import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.MGM_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "mgm.db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS cases (
    id             TEXT PRIMARY KEY,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    project_name   TEXT NOT NULL,
    ticker         TEXT,
    chain          TEXT NOT NULL DEFAULT 'arc',
    contract       TEXT NOT NULL,
    amount_usd     REAL NOT NULL,
    category       TEXT NOT NULL,
    story          TEXT NOT NULL,
    refund_wallet  TEXT NOT NULL,
    wallet_address TEXT NOT NULL DEFAULT '',
    signature      TEXT,
    signed_at      INTEGER,
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
  );

  CREATE TABLE IF NOT EXISTS proofs (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id  TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    path     TEXT NOT NULL,
    name     TEXT,
    size     INTEGER,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS supports (
    case_id    TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    voter      TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (case_id, voter)
  );

  -- single-use challenges for wallet signatures
  CREATE TABLE IF NOT EXISTS nonces (
    nonce      TEXT PRIMARY KEY,
    address    TEXT NOT NULL,
    issued_at  INTEGER NOT NULL,
    used_at    INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_cases_amount  ON cases(amount_usd DESC);
  CREATE INDEX IF NOT EXISTS idx_cases_status  ON cases(status);
  CREATE INDEX IF NOT EXISTS idx_cases_wallet  ON cases(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_proofs_case   ON proofs(case_id, position);
  CREATE INDEX IF NOT EXISTS idx_nonces_issued ON nonces(issued_at);
`;

/** Columns added after the first release — applied to databases created earlier. */
const ADDED_COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: "cases", column: "wallet_address", ddl: "ALTER TABLE cases ADD COLUMN wallet_address TEXT NOT NULL DEFAULT ''" },
  { table: "cases", column: "signature", ddl: "ALTER TABLE cases ADD COLUMN signature TEXT" },
  { table: "cases", column: "signed_at", ddl: "ALTER TABLE cases ADD COLUMN signed_at INTEGER" },
  { table: "cases", column: "signed_nonce", ddl: "ALTER TABLE cases ADD COLUMN signed_nonce TEXT" },
  { table: "cases", column: "signed_site", ddl: "ALTER TABLE cases ADD COLUMN signed_site TEXT" },
];

function migrate(db: Database.Database) {
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(ddl);
  }
}

function create(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

const g = globalThis as unknown as { __mgmDb?: Database.Database };
export const db: Database.Database = g.__mgmDb ?? (g.__mgmDb = create());
