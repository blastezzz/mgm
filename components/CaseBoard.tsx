"use client";

import Link from "next/link";
import { useStoredOption } from "@/lib/clientStore";
import { CaseCard, CaseRow } from "./CaseCard";
import { IconGrid, IconList } from "./Icons";
import type { RefundCase } from "@/lib/types";

export type SortKey = "trending" | "new" | "top" | "reviewing" | "refunded";

const VIEWS = ["grid", "list"] as const;

const SORTS: { key: SortKey; label: string; icon: string }[] = [
  { key: "trending",  label: "Trending",      icon: "🔥" },
  { key: "new",       label: "New",           icon: "✦" },
  { key: "top",       label: "Biggest loss",  icon: "▲" },
  { key: "reviewing", label: "In review",     icon: "⏳" },
  { key: "refunded",  label: "Refunded",      icon: "✓" },
];

interface Props {
  items: RefundCase[];
  total: number;
  page: number;
  pages: number;
  sort: SortKey;
  q: string;
  perPage: number;
}

function href(patch: Record<string, string | number | undefined>, base: Props) {
  const p = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = {
    sort: base.sort, q: base.q, page: base.page, ...patch,
  };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || v === null) continue;
    if (k === "sort" && v === "trending") continue;
    if (k === "page" && Number(v) <= 1) continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return `/${qs ? `?${qs}` : ""}#claims`;
}

export function CaseBoard(props: Props) {
  const { items, total, page, pages, sort, q } = props;
  const [view, setView] = useStoredOption<"grid" | "list">("mgm:view", VIEWS, "grid");

  const start = (page - 1) * props.perPage;
  const windowed = pageWindow(page, pages);

  return (
    <section className="section" id="claims">
      <div className="section-head">
        <h2 className="section-title">All claims</h2>
        <span className="section-note">{total.toLocaleString("en-US")} filed</span>
      </div>

      <div className="board-toolbar">
        {SORTS.map((s) => (
          <Link key={s.key} href={href({ sort: s.key, page: 1 }, props)} className="pill" data-active={sort === s.key}>
            <span aria-hidden>{s.icon}</span> {s.label}
          </Link>
        ))}

        <div className="spacer" />

        <span className="tag" style={{ height: 30 }}>Arc · USDC-native</span>

        <div className="view-toggle">
          <button onClick={() => setView("grid")} data-active={view === "grid"} aria-label="Grid view"><IconGrid /></button>
          <button onClick={() => setView("list")} data-active={view === "list"} aria-label="List view"><IconList /></button>
        </div>
      </div>

      {q ? (
        <p className="section-note" style={{ marginBottom: 16 }}>
          Results for “{q}” — <Link href={href({ q: undefined, page: 1 }, props)} style={{ color: "var(--jade-500)" }}>clear</Link>
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="empty">
          No claims here yet.{" "}
          <Link href="/submit" style={{ color: "var(--jade-500)" }}>File the first one ↗</Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid">
          {items.map((c, i) => <CaseCard key={c.id} c={c} rank={start + i + 1} />)}
        </div>
      ) : (
        <div className="list">
          <div className="row row-head">
            <span>#</span><span>Proof</span><span>Project</span>
            <span className="hide-sm">Category</span><span>Lost</span>
            <span className="hide-sm">Backing</span><span className="hide-sm">Status</span>
          </div>
          {items.map((c, i) => <CaseRow key={c.id} c={c} rank={start + i + 1} />)}
        </div>
      )}

      {pages > 1 ? (
        <nav className="pager" aria-label="Pagination">
          <Link href={href({ page: Math.max(1, page - 1) }, props)} className="pager-link">
            <button disabled={page <= 1}>←</button>
          </Link>
          {windowed.map((n, i) =>
            n === null ? (
              <button key={`gap-${i}`} disabled>…</button>
            ) : (
              <Link key={n} href={href({ page: n }, props)}>
                <button data-active={n === page}>{n}</button>
              </Link>
            ),
          )}
          <Link href={href({ page: Math.min(pages, page + 1) }, props)}>
            <button disabled={page >= pages}>→</button>
          </Link>
        </nav>
      ) : null}
    </section>
  );
}

function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | null)[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pages - 1, page + 1);
  if (from > 2) out.push(null);
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pages - 1) out.push(null);
  out.push(pages);
  return out;
}
