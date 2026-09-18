import Link from "next/link";
import { LogoMark } from "./Logo";

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
            </ul>
          </div>

          <div>
            <h4>Community</h4>
            <ul>
              <li><a href="https://x.com" target="_blank" rel="noreferrer noopener">X / Twitter</a></li>
              <li><a href="https://t.me" target="_blank" rel="noreferrer noopener">Telegram</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-note">
          <span>© {new Date().getFullYear()} MGM — Minara Get My Money</span>
          <span>Reports are user-submitted. Verify independently before acting on them.</span>
        </div>
      </div>
    </footer>
  );
}
