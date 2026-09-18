import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { ago, shortAddr, usd } from "@/lib/format";
import { isVectorProof } from "@/lib/images";
import { CATEGORY_LABEL, SUPPORT_THRESHOLD, type RefundCase } from "@/lib/types";

function pct(c: RefundCase) {
  return Math.min(100, Math.round((c.supports / SUPPORT_THRESHOLD) * 100));
}

export function CaseCard({ c, rank }: { c: RefundCase; rank?: number }) {
  const cover = c.proofs[0]?.path;
  return (
    <Link href={`/case/${c.id}`} className="card">
      <div className="card-media">
        {cover ? (
          <Image
            src={cover}
            alt={`Proof submitted for ${c.projectName}`}
            fill
            sizes="(max-width: 520px) 100vw, (max-width: 820px) 50vw, (max-width: 1080px) 33vw, 280px"
            unoptimized={isVectorProof(cover)}
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        ) : null}
        <div className="card-media-top">
          {rank ? <span className="rank">#{rank}</span> : <span className="rank">{c.id.replace("MGM-", "")}</span>}
          <span className="card-age">{ago(c.createdAt)}</span>
        </div>
        <div className="card-media-bottom">
          <StatusBadge status={c.status} />
        </div>
        <div className="bar on-media" title={`${c.supports} backers`}>
          <i style={{ width: `${pct(c)}%` }} />
        </div>
      </div>

      <div className="card-body">
        <h3 className="card-title">
          {c.projectName}
          {c.ticker ? <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}> · {c.ticker}</span> : null}
        </h3>

        <div className="card-meta">
          <span className="k">Lost</span>
          <span className="v">{usd(c.amountUsd)}</span>
          <span className="tag" style={{ marginLeft: "auto" }}>{CATEGORY_LABEL[c.category]}</span>
        </div>

        <div className="card-ca">
          Arc · {shortAddr(c.contract, 8, 6)}
        </div>

        <div className="card-foot">
          <span>▲ {c.supports} backing</span>
          {c.signature ? <span className="signed-line">✓ signed</span> : null}
          <span>{c.proofs.length} proof{c.proofs.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </Link>
  );
}

export function CaseRow({ c, rank }: { c: RefundCase; rank: number }) {
  const cover = c.proofs[0]?.path;
  return (
    <Link href={`/case/${c.id}`} className="row">
      <span className="row-num" style={{ color: "var(--text-tertiary)" }}>#{rank}</span>
      {cover ? (
        <Image
          className="row-thumb"
          src={cover}
          alt=""
          width={44}
          height={44}
          sizes="44px"
          unoptimized={isVectorProof(cover)}
        />
      ) : (
        <span className="row-thumb" />
      )}
      <span>
        <span className="row-title">{c.projectName}{c.ticker ? ` · ${c.ticker}` : ""}</span>
        <span className="row-ca">Arc · {shortAddr(c.contract, 10, 6)}</span>
      </span>
      <span className="row-ca row-cell hide-sm">{CATEGORY_LABEL[c.category]}</span>
      <span className="row-num loss">{usd(c.amountUsd)}</span>
      <span className="row-num hide-sm" style={{ color: "var(--text-secondary)" }}>▲ {c.supports}</span>
      <span className="hide-sm"><StatusBadge status={c.status} /></span>
    </Link>
  );
}
