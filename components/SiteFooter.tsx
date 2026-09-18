import Link from "next/link";
import { LogoMark } from "./Logo";
import { CopyValue } from "./CopyValue";
import { MGM_CONTRACT, POOL_WALLET, SOURCE_URL, SUPPORT_EMAIL, X_URL } from "@/lib/types";
import { shortAddr } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <span className="brand">
              <LogoMark size={22} />
              <span className="brand-word">mgm<span>.fund</span></span>
            </span>
            <p className="footer-blurb">
              Minara Get My Money — the public claim book for capital lost to
              rugs, dumps and absent teams. Evidence first, always.
            </p>
          </div>

          <div>
            <h4>Claims</h4>
            <ul>
              <li><Link href="/#claims">All claims</Link></li>
              <li><Link href="/?sort=top#claims">Biggest losses</Link></li>
              <li><Link href="/?sort=refunded#claims">Refunded</Link></li>
              <li><Link href="/submit">File a claim</Link></li>
            </ul>
          </div>

          <div>
            <h4>Protocol</h4>
            <ul>
              <li><Link href="/how-it-works">How it works</Link></li>
              <li><Link href="/how-it-works#evidence">Evidence rules</Link></li>
              <li><Link href="/how-it-works#status">Claim statuses</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a></li>
            </ul>
          </div>

          <div>
            <h4>Open source</h4>
            <ul>
              <li><a href={SOURCE_URL} target="_blank" rel="noreferrer noopener">Source code on GitHub</a></li>
              <li><a href={`${SOURCE_URL}/blob/main/README.md`} target="_blank" rel="noreferrer noopener">How it is built</a></li>
              <li><a href={X_URL} target="_blank" rel="noreferrer noopener">@mgm_fund on X</a></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-addresses">
          <span className="fa">
            <span className="k">$MGM contract</span>
            {MGM_CONTRACT ? (
              <CopyValue value={MGM_CONTRACT} label={shortAddr(MGM_CONTRACT, 10, 8)} />
            ) : (
              <span className="pending">drops at launch</span>
            )}
          </span>
          <span className="fa">
            <span className="k">Refund pool</span>
            <CopyValue value={POOL_WALLET} label={shortAddr(POOL_WALLET, 10, 8)} />
          </span>
        </div>

        <div className="footer-note">
          <span>© {new Date().getFullYear()} MGM — Minara Get My Money</span>
          <span>
            Reports are user-submitted. Verify independently before acting on them. ·{" "}
            <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener" style={{ color: "var(--jade-500)" }}>
              MIT-licensed source
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
