import { NextResponse } from "next/server";
import { issueNonce } from "@/lib/nonces";
import { ADDRESS } from "@/lib/validate";

export const runtime = "nodejs";

/** Hands out the single-use challenge a claimant signs with their wallet. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { address?: string };
  const address = body.address?.trim() ?? "";

  if (!ADDRESS.test(address)) {
    return NextResponse.json({ error: "Connect a valid wallet first" }, { status: 400 });
  }

  const { nonce, issuedAt } = issueNonce(address);
  return NextResponse.json({ nonce, issuedAt });
}
