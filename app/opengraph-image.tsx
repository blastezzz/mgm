import { ImageResponse } from "next/og";

export const alt = "MGM — Minara Get My Money: evidence-first refund claims for tokens rugged on Minara";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const JADE = "#49edbf";
const INK = "#050807";

/** Social card for every page that does not supply its own image. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          backgroundImage: "linear-gradient(135deg, rgba(73,237,191,0.12) 0%, rgba(73,237,191,0.03) 38%, rgba(5,8,7,0) 62%)",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="58" height="58" viewBox="0 0 32 32" fill="none">
            <rect
              x="4.9"
              y="4.9"
              width="22.2"
              height="22.2"
              rx="7"
              stroke={JADE}
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeDasharray="60 18"
              strokeDashoffset="-9"
            />
            <rect x="11.5" y="11.5" width="9" height="9" rx="1.6" fill={JADE} />
          </svg>
          <div style={{ display: "flex", fontSize: 34, color: "#f5f7f6", fontWeight: 600, letterSpacing: -1 }}>
            mgm<span style={{ color: "#6f7e76" }}>.fund</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              lineHeight: 1.08,
              letterSpacing: -3,
              fontWeight: 700,
              color: "#f5f7f6",
            }}
          >
            <div style={{ display: "flex" }}>Report the scam,</div>
            <div style={{ display: "flex" }}>prove the loss,</div>
            <div style={{ display: "flex", color: JADE }}>claim the refund.</div>
          </div>

          <div style={{ display: "flex", fontSize: 27, color: "#a8b3ad", maxWidth: 900, lineHeight: 1.45 }}>
            The public claim book for capital rugged on Minara. Screenshots required, every claim signed
            by the wallet that took the loss.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderRadius: 999,
              border: "1px solid #0d604b",
              background: "rgba(73, 237, 191, 0.07)",
              fontSize: 22,
              color: JADE,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 12, background: JADE, display: "flex" }} />
            100% of $MGM creator fees fund the refund pool
          </div>
        </div>
      </div>
    ),
    size,
  );
}
