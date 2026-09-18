import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment check: says whether storage is wired up, without ever echoing a
 * secret. Reports which integrations are present and whether a trivial query
 * against the database succeeds.
 */
export async function GET() {
  const env = {
    databaseUrl: Boolean(process.env.DATABASE_URL ?? process.env.POSTGRES_URL),
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    adminKey: Boolean(process.env.MGM_ADMIN_KEY),
    salt: Boolean(process.env.MGM_SALT),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    vercel: Boolean(process.env.VERCEL),
    // names only, never values — shows when an integration used a prefixed name
    storageVars: Object.keys(process.env)
      .filter((k) => /BLOB|POSTGRES|DATABASE|NEON/i.test(k))
      .sort(),
  };

  let db: { ok: boolean; claims?: number; error?: string };
  try {
    const rows = await query<{ n: string | number }>("SELECT COUNT(*) AS n FROM cases");
    db = { ok: true, claims: Number(rows[0]?.n ?? 0) };
  } catch (err) {
    db = { ok: false, error: (err as Error).message.slice(0, 300) };
  }

  return NextResponse.json({ env, db }, { status: db.ok ? 200 : 503 });
}
