import Link from "next/link";
import { CaseBoard, type SortKey } from "@/components/CaseBoard";
import { TopClaims } from "@/components/TopClaims";
import { listCases, getStats } from "@/lib/cases";
import { usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;
const SORTS: SortKey[] = ["trending", "new", "top", "reviewing", "refunded"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = (SORTS.includes(sp.sort as SortKey) ? sp.sort : "trending") as SortKey;
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const stats = getStats();
  const { items, total, pages } = listCases({ sort, q, page, perPage: PER_PAGE });
  const top = listCases({ sort: "top", perPage: 4 }).items;
  const ticker = listCases({ sort: "new", perPage: 12 }).items;

  return (
    <main className="page">
      <section className="hero">
        <div className="shell hero-inner">
          <span className="hero-eyebrow">
            <span className="dot" />
            <b>{stats.totalCases}</b>&nbsp;claims filed · <b>{usd(stats.totalLost)}</b>&nbsp;reported lost
          </span>

          <h1>
            Report the scam, prove the loss, <em>claim the refund.</em>
          </h1>

          <p className="hero-sub">
            Minara Get My Money is the public claim book for capital rugged on Arc. Post the contract,
            attach your screenshots and sign the claim with the wallet that took the loss — no proof and
            no signature means no claim, which is why the ones here are worth reading.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" href="/submit">File a claim ↗</Link>
            <Link className="btn btn-ghost btn-lg" href="/how-it-works">How it works ›</Link>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-k">Total reported</div>
              <div className="stat-v loss">{usd(stats.totalLost)}</div>
            </div>
            <div className="stat">
              <div className="stat-k">Claims filed</div>
              <div className="stat-v">{stats.totalCases.toLocaleString("en-US")}</div>
            </div>
            <div className="stat">
              <div className="stat-k">Refunded</div>
              <div className="stat-v good">{usd(stats.totalRefunded)}</div>
            </div>
            <div className="stat">
              <div className="stat-k">Arc contracts flagged</div>
              <div className="stat-v">{stats.projectsFlagged.toLocaleString("en-US")}</div>
            </div>
          </div>
        </div>
      </section>

      {ticker.length ? (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...ticker, ...ticker].map((c, i) => (
              <span key={`${c.id}-${i}`}>
                {c.projectName} <b>−{usd(c.amountUsd)}</b> · {c.id}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="shell">
        <TopClaims items={top} />
        <CaseBoard
          items={items}
          total={total}
          page={page}
          pages={pages}
          sort={sort}
          q={q}
          perPage={PER_PAGE}
        />
      </div>
    </main>
  );
}
