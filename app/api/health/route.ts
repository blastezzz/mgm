import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment check: says whether storage is wired up, without ever echoing a
 * secret. Reports which integrations are present and whether a trivial query
 * against the database succeeds.
 */
export async function GET(req: Request) {
  const env = {
    databaseUrl: Boolean(process.env.DATABASE_URL ?? process.env.POSTGRES_URL),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_STORE_ID),
    blobAuth: process.env.BLOB_READ_WRITE_TOKEN ? "token" : process.env.BLOB_STORE_ID ? "oidc" : null,
    adminKey: Boolean(process.env.MGM_ADMIN_KEY),
    salt: Boolean(process.env.MGM_SALT),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    vercel: Boolean(process.env.VERCEL),
    // variable names help diagnose a prefixed integration, but they describe the
    // infrastructure, so they are only listed for an authenticated caller
    storageVars: isAdmin(req)
      ? Object.keys(process.env).filter((k) => /BLOB|POSTGRES|DATABASE|NEON/i.test(k)).sort()
      : undefined,
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
