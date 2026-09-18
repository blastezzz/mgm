import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyValue } from "@/components/CopyValue";
import { SupportButton } from "@/components/SupportButton";
import { StatusBadge } from "@/components/StatusBadge";
import { bumpViews, getCase, listCases } from "@/lib/cases";
import { verifyClaim } from "@/lib/verify";
import { ago, dateLine, shortAddr, usd } from "@/lib/format";
import { explorerUrl } from "@/lib/validate";
import { CATEGORY_LABEL, STATUS_LABEL, type CaseStatus } from "@/lib/types";
import { CaseCard } from "@/components/CaseCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = getCase(id);
  if (!c) return { title: "Claim not found" };
  return {
    title: `${c.projectName} — ${usd(c.amountUsd)} refund claim`,
    description: c.story.slice(0, 180),
    openGraph: { images: c.proofs[0] ? [c.proofs[0].path] : [] },
  };
}

const TIMELINE: { status: CaseStatus; blurb: string }[] = [
  { status: "pending",   blurb: "Claim published with proof attached" },
  { status: "reviewing", blurb: "Escalated — evidence being checked against the chain" },
  { status: "verified",  blurb: "Evidence holds up; claim stands against the contract" },
  { status: "refunded",  blurb: "Funds returned to the claimant's wallet" },
];

export default async function CasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const c = getCase(id);
  if (!c) notFound();

  bumpViews(c.id);

  const signature = await verifyClaim(c);
  const related = listCases({ contract: c.contract, sort: "top", perPage: 5 }).items.filter((x) => x.id !== c.id).slice(0, 4);
  const explorer = explorerUrl(c.contract);
  const reachedIndex = TIMELINE.findIndex((t) => t.status === c.status);
  const rejected = c.status === "rejected";

  return (
    <main className="page">
      <div className="shell" style={{ paddingTop: 32 }}>
        <div className="crumbs">
          <Link href="/">Claims</Link> <span>/</span>
          <span style={{ fontFamily: "var(--font-data)" }}>{c.id}</span>
        </div>

        {isNew ? (
          <div className="notice" style={{ marginBottom: 24 }}>
            <span>
              <b>Your claim is live.</b> Share this link — backing from other holders is what pushes a
              claim into review. Bookmark <span style={{ fontFamily: "var(--font-data)", color: "var(--jade-500)" }}>{c.id}</span> to track it.
            </span>
          </div>
        ) : null}

        <div className="detail-head">
          <div style={{ minWidth: 0 }}>
            <h1>{c.projectName}{c.ticker ? <span style={{ color: "var(--text-tertiary)" }}> · {c.ticker}</span> : null}</h1>
            <div className="detail-sub">
              <StatusBadge status={c.status} />
              <span className="tag">{CATEGORY_LABEL[c.category]}</span>
              <span className="tag">Arc</span>
              {signature.state === "valid" ? (
                <span className="signed-line">✓ wallet signature verified</span>
              ) : signature.state === "invalid" ? (
                <span className="signed-line" style={{ color: "var(--signal-coral)" }}>✕ signature invalid</span>
              ) : null}
              <span className="tag">filed {ago(c.createdAt)} ago</span>
              <span className="tag">{c.views.toLocaleString("en-US")} views</span>
            </div>
          </div>
        </div>

        <div className="detail-layout">
          <div>
            <div className="panel">
              <h2 className="panel-title">The case</h2>
              <p className="story">{c.story}</p>
            </div>

            <div className="panel">
              <h2 className="panel-title">Evidence · {c.proofs.length} screenshot{c.proofs.length === 1 ? "" : "s"}</h2>
              <div className="gallery">
                {c.proofs.map((p, i) => (
                  <a key={p.id} href={p.path} target="_blank" rel="noreferrer noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.path} alt={p.name ?? `Proof ${i + 1} for ${c.projectName}`} loading="lazy" />
                    <span className="lbl">PROOF {String(i + 1).padStart(2, "0")}</span>
                  </a>
                ))}
              </div>
              {c.evidenceUrl ? (
                <p style={{ marginTop: 18, marginBottom: 0, fontFamily: "var(--font-data)", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-tertiary)" }}>External evidence: </span>
                  <a href={c.evidenceUrl} target="_blank" rel="noreferrer noopener nofollow" style={{ color: "var(--jade-500)", wordBreak: "break-all" }}>
                    {c.evidenceUrl}
                  </a>
                </p>
              ) : null}
            </div>

            <div className="panel">
              <h2 className="panel-title">Claim progress</h2>
              {rejected ? (
                <div className="notice bad">
                  <span>
                    <b>This claim was rejected.</b>{" "}
                    {c.adminNote ?? "The evidence did not hold up against the contract history."}
                  </span>
                </div>
              ) : (
                <div className="timeline">
                  {TIMELINE.map((t, i) => (
                    <div className="tl" key={t.status} data-done={i <= reachedIndex}>
                      <span className="dot" />
                      <span>
                        <span className="t">{STATUS_LABEL[t.status]}</span>
                        <span className="d">{t.blurb}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {c.adminNote && !rejected ? (
                <div className="notice" style={{ marginTop: 20 }}>
                  <span><b>Reviewer note.</b> {c.adminNote}</span>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="sticky">
            <div className="panel">
              <div className="stat-k" style={{ marginBottom: 10 }}>Reported loss</div>
              <div className="amount-big">−{usd(c.amountUsd, false)}</div>
              <div style={{ margin: "22px 0" }}>
                <SupportButton id={c.id} initial={c.supports} />
              </div>

              <div className="kv">
                <div className="kv-item">
                  <span className="k">Claim ID</span>
                  <span className="v">{c.id}</span>
                </div>
                <div className="kv-item">
                  <span className="k">Contract</span>
                  <span className="v"><CopyValue value={c.contract} label={shortAddr(c.contract, 8, 6)} /></span>
                </div>
                <div className="kv-item">
                  <span className="k">Claimant wallet</span>
                  <span className="v"><CopyValue value={c.walletAddress || c.refundWallet} label={shortAddr(c.walletAddress || c.refundWallet, 8, 6)} /></span>
                </div>
                {c.txHash ? (
                  <div className="kv-item">
                    <span className="k">Tx hash</span>
                    <span className="v"><CopyValue value={c.txHash} label={shortAddr(c.txHash, 8, 6)} /></span>
                  </div>
                ) : null}
                <div className="kv-item">
                  <span className="k">Filed by</span>
                  <span className="v">{c.reporter}</span>
                </div>
                {c.contact ? (
                  <div className="kv-item">
                    <span className="k">Contact</span>
                    <span className="v">{c.contact}</span>
                  </div>
                ) : null}
                <div className="kv-item">
                  <span className="k">Filed</span>
                  <span className="v">{dateLine(c.createdAt)}</span>
                </div>
                {c.signature ? (
                  <div className="kv-item">
                    <span className="k">Signature</span>
                    <span className="v"><CopyValue value={c.signature} label={shortAddr(c.signature, 8, 6)} /></span>
                  </div>
                ) : null}
              </div>

              {explorer ? (
                <a className="btn btn-ghost btn-block" style={{ marginTop: 20 }} href={explorer} target="_blank" rel="noreferrer noopener">
                  Open contract on explorer ↗
                </a>
              ) : null}
            </div>

            {signature.state === "valid" ? (
              <div className="notice">
                <span>
                  <b>Ownership signed.</b> The claimant proved control of{" "}
                  <span style={{ fontFamily: "var(--font-data)", color: "var(--jade-500)" }}>
                    {shortAddr(c.walletAddress, 6, 4)}
                  </span>{" "}
                  by signing this claim — its contract, amount and proof count — with their wallet.
                  Re-checked on this page load. A refund can only go to that address.
                </span>
              </div>
            ) : signature.state === "invalid" ? (
              <div className="notice bad">
                <span>
                  <b>Signature does not check out.</b> {signature.reason}. Treat this claim as
                  unverified — the stored signature no longer matches its contents.
                </span>
              </div>
            ) : (
              <div className="notice warn">
                <span>
                  <b>No wallet signature.</b> This claim was filed without one, so nothing proves the
                  loss belongs to the address shown.
                </span>
              </div>
            )}

            <div className="notice warn" style={{ marginTop: 16 }}>
              <span>
                <b>User-submitted report.</b> MGM publishes claims with evidence attached; it does not
                adjudicate them. Do your own checks before sending anyone anything.
              </span>
            </div>
          </aside>
        </div>

        {related.length ? (
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">Other claims against this contract</h2>
              <span className="section-note">{related.length} more</span>
            </div>
            <div className="grid">
              {related.map((r, i) => <CaseCard key={r.id} c={r} rank={i + 1} />)}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
