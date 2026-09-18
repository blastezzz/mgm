/**
 * MGM mark — an open recovery loop around a solid square: the position you are
 * owed sits inside a ring that is deliberately not closed until you are paid.
 * One geometry, used for the favicon, the social card and the X profile too.
 */
export function LogoMark({ size = 26, color = "var(--jade-500)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect
        x="4.9"
        y="4.9"
        width="22.2"
        height="22.2"
        rx="7"
        stroke={color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="60 18"
        strokeDashoffset="-9"
      />
      <rect x="11.5" y="11.5" width="9" height="9" rx="1.6" fill={color} />
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
