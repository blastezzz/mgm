import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { createCase, recentCountByAuthor, recentCountByWallet } from "@/lib/cases";
import { consumeNonce } from "@/lib/nonces";
import { claimMessage, normalizeAmount, SITE } from "@/lib/signing";
import { saveProofs, removeProofs, UploadError } from "@/lib/uploads";
import { visitorId } from "@/lib/request";
import { validateDraft, LIMITS } from "@/lib/validate";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";

const MAX_PER_HOUR = 5;
const MAX_PER_WALLET_HOUR = 3;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the submitted form" }, { status: 400 });
  }

  const author = visitorId(req);
  if (recentCountByAuthor(author) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: `You can file ${MAX_PER_HOUR} claims per hour. Try again later.` }, { status: 429 });
  }

  const files = fd.getAll("proofs").filter((f): f is File => f instanceof File && f.size > 0);
  const walletAddress = str(fd, "walletAddress").toLowerCase();
  const signature = str(fd, "signature");
  const nonce = str(fd, "nonce");

  const draft = {
    projectName: str(fd, "projectName"),
    ticker: str(fd, "ticker"),
    contract: str(fd, "contract"),
    amountUsd: str(fd, "amountUsd"),
    category: str(fd, "category"),
    story: str(fd, "story"),
    txHash: str(fd, "txHash"),
    evidenceUrl: str(fd, "evidenceUrl"),
    contact: str(fd, "contact"),
    reporter: str(fd, "reporter"),
    confirmed: str(fd, "confirmed") === "true",
    proofCount: files.length,
    walletAddress,
  };

  const errors = validateDraft(draft);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Some fields need fixing", errors }, { status: 422 });
  }

  if (recentCountByWallet(walletAddress) >= MAX_PER_WALLET_HOUR) {
    return NextResponse.json(
      { error: `This wallet already filed ${MAX_PER_WALLET_HOUR} claims in the last hour.` },
      { status: 429 },
    );
  }

  /* ---- wallet ownership ------------------------------------------------ */

  if (!/^0x[a-fA-F0-9]{130,}$/.test(signature)) {
    return NextResponse.json({ error: "Missing wallet signature", errors: { walletAddress: "Sign the claim with your wallet" } }, { status: 422 });
  }

  const challenge = consumeNonce(nonce, walletAddress);
  if (!challenge.ok) {
    return NextResponse.json({ error: challenge.reason, errors: { walletAddress: challenge.reason } }, { status: 422 });
  }

  const amountUsd = normalizeAmount(draft.amountUsd);
  const contract = draft.contract.toLowerCase();
  const message = claimMessage({
    address: walletAddress,
    contract,
    amountUsd,
    proofCount: files.length,
    nonce,
    issuedAt: challenge.issuedAt,
  });

  let signer = false;
  try {
    signer = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    signer = false;
  }

  if (!signer) {
    return NextResponse.json(
      { error: "That signature does not match the connected wallet", errors: { walletAddress: "Signature does not match this wallet" } },
      { status: 422 },
    );
  }

  /* ---- persist --------------------------------------------------------- */

  let saved: { path: string; name: string | null; size: number }[] = [];
  try {
    saved = await saveProofs(files);
    const created = createCase({
      projectName: draft.projectName,
      ticker: draft.ticker ? draft.ticker.toUpperCase().replace(/^\$/, "") : null,
      contract,
      amountUsd,
      category: draft.category as Category,
      story: draft.story.slice(0, LIMITS.story),
      walletAddress,
      signature,
      signedAt: challenge.issuedAt,
      signedNonce: nonce,
      signedSite: SITE,
      txHash: draft.txHash || null,
      evidenceUrl: draft.evidenceUrl || null,
      contact: draft.contact || null,
      reporter: draft.reporter || "anon",
      authorHash: author,
      proofs: saved,
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    await removeProofs(saved.map((s) => s.path));
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message, errors: { proofCount: err.message } }, { status: 422 });
    }
    console.error("[mgm] claim failed", err);
    return NextResponse.json({ error: "Could not file the claim. Try again." }, { status: 500 });
  }
}
