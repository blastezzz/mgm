import { ImageResponse } from "next/og";
import { MGM_CONTRACT } from "@/lib/types";

export const runtime = "nodejs";

const JADE = "#49edbf";
const INK = "#050807";

/**
 * X header, 1500×500. The profile picture sits over the lower-left corner and
 * the ends get cropped on narrow screens, so the composition is centred and
 * keeps clear of both.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          backgroundColor: INK,
          backgroundImage:
            "linear-gradient(120deg, rgba(73,237,191,0.13) 0%, rgba(73,237,191,0.03) 30%, rgba(5,8,7,0) 55%)",
          padding: "56px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="66" height="66" viewBox="0 0 32 32" fill="none">
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
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1.6, color: "#f5f7f6" }}>
            mgm<span style={{ color: "#6f7e76" }}>.fund</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#f5f7f6",
            textAlign: "center",
          }}
        >
          Report the scam, prove the loss,&nbsp;<span style={{ color: JADE }}>claim the refund.</span>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#a8b3ad", marginTop: -8 }}>
          Refund claims for tokens rugged on Minara
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              borderRadius: 999,
              border: "1px solid #0d604b",
              background: "rgba(73, 237, 191, 0.07)",
              fontSize: 22,
              color: JADE,
            }}
          >
            <div style={{ width: 11, height: 11, borderRadius: 11, background: JADE, display: "flex" }} />
            100% of $MGM creator fees fund the refund pool
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 22px",
              borderRadius: 999,
              border: "1px solid #18231e",
              background: "#0b110f",
              fontSize: MGM_CONTRACT ? 19 : 22,
              color: "#a8b3ad",
            }}
          >
            {MGM_CONTRACT ? `$MGM ${MGM_CONTRACT}` : "$MGM CA drops here first"}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 20, color: "#6f7e76" }}>
          @mgm_fund · github.com/blastezzz/mgm · mgmarcsupport@gmail.com
        </div>
      </div>
    ),
    { width: 1500, height: 500 },
  );
}
