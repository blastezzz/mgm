"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "./Logo";
import { IconClose, IconMenu, IconSearch, IconTelegram, IconX } from "./Icons";

function NavSearchField({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      className="nav-search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/?q=${encodeURIComponent(term)}#claims` : "/#claims");
      }}
    >
      <IconSearch />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search claims, tokens, contracts"
        aria-label="Search claims"
      />
    </form>
  );
}

/** Remounts on every URL change so the field always reflects the active query. */
function NavSearch() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  return <NavSearchField key={initial} initial={initial} />;
}

export function SiteNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Link href="/" aria-label="mgm.fund home">
          <Logo />
        </Link>

        <Suspense fallback={<div className="nav-search" />}>
          <NavSearch />
        </Suspense>

        <nav className="nav-right">
          <Link className="nav-link" href="/#claims" data-active={pathname === "/"}>
            Claims
          </Link>
          <Link className="nav-link" href="/how-it-works" data-active={pathname === "/how-it-works"}>
            How it works
          </Link>
          <a className="icon-btn nav-social" href="https://t.me" target="_blank" rel="noreferrer noopener" aria-label="Telegram">
            <IconTelegram />
          </a>
          <a className="icon-btn nav-social" href="https://x.com" target="_blank" rel="noreferrer noopener" aria-label="X">
            <IconX />
          </a>
          <Link className="btn btn-primary" href="/submit" onClick={() => setMenu(false)}>
            File a claim ↗
          </Link>
          <button
            className="icon-btn nav-burger"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <IconClose size={14} /> : <IconMenu />}
          </button>
        </nav>
      </div>

      {menu ? (
        <div className="nav-sheet" onClick={() => setMenu(false)}>
          <div className="shell">
            <Suspense fallback={null}>
              <NavSearch />
            </Suspense>
            <Link href="/#claims">All claims <span>›</span></Link>
            <Link href="/?sort=top#claims">Biggest losses <span>›</span></Link>
            <Link href="/?sort=refunded#claims">Refunded <span>›</span></Link>
            <Link href="/how-it-works">How it works <span>›</span></Link>
            <a href="https://x.com" target="_blank" rel="noreferrer noopener">X / Twitter <span>↗</span></a>
            <a href="https://t.me" target="_blank" rel="noreferrer noopener">Telegram <span>↗</span></a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
