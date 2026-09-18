import Image from "next/image";
import Link from "next/link";
import { ago, shortAddr, usd } from "@/lib/format";
import { isVectorProof } from "@/lib/images";
import type { RefundCase } from "@/lib/types";

export function TopClaims({ items }: { items: RefundCase[] }) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Largest open claims</h2>
        <span className="section-note">by reported loss</span>
      </div>
      <div className="top-grid">
        {items.map((c, i) => (
          <Link key={c.id} href={`/case/${c.id}`} className="top-card">
            <span className="rk">#{i + 1}</span>
            {c.proofs[0]?.path ? (
              <Image
                className="th"
                src={c.proofs[0].path}
                alt=""
                width={62}
                height={62}
                sizes="62px"
                unoptimized={isVectorProof(c.proofs[0].path)}
              />
            ) : (
              <span className="th" />
            )}
            <span style={{ minWidth: 0 }}>
              <span className="nm">{c.projectName}{c.ticker ? ` · ${c.ticker}` : ""}</span>
              <span className="ln">
                <span className="amt">−{usd(c.amountUsd)}</span>
                <span className="bk">▲ {c.supports}</span>
              </span>
              <span className="ln2">
                <span>Arc · {shortAddr(c.contract, 6, 4)}</span>
                <span>· {ago(c.createdAt)} ago</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
