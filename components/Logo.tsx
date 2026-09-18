/**
 * MGM mark — a capital return loop: the square (your position) sits inside an
 * open recovery arc that points back at it. Geometry echoes minara's hard-edged
 * circle/square language without copying it.
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M23 14a9 9 0 1 1-3.6-7.2"
        stroke="var(--jade-500)"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <path d="M23 3.5v5.2h-5.2" stroke="var(--jade-500)" strokeWidth="2.4" strokeLinecap="square" />
      <rect x="10" y="10" width="8" height="8" rx="1" fill="var(--jade-500)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-word">
        mgm<span>.fund</span>
      </span>
    </span>
  );
}
