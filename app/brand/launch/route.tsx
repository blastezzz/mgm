import { ImageResponse } from "next/og";
import { POOL_WALLET } from "@/lib/types";

export const runtime = "nodejs";

const JADE = "#49edbf";
const INK = "#050807";

function Point({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "rgba(73,237,191,0.12)",
          border: "1px solid #0d604b",
          color: JADE,
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", fontSize: 25, fontWeight: 600, color: "#f5f7f6", letterSpacing: -0.5 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#a8b3ad" }}>{body}</div>
      </div>
    </div>
  );
}

/** Launch card for the first X post, 1200×675. */
export async function GET() {
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
          backgroundImage:
            "linear-gradient(128deg, rgba(73,237,191,0.15) 0%, rgba(73,237,191,0.035) 32%, rgba(5,8,7,0) 58%)",
          padding: "58px 66px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
            <rect x="4.9" y="4.9" width="22.2" height="22.2" rx="7" stroke={JADE} strokeWidth="3.6"
              strokeLinecap="round" strokeDasharray="60 18" strokeDashoffset="-9" />
            <rect x="11.5" y="11.5" width="9" height="9" rx="1.6" fill={JADE} />
          </svg>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: -1, color: "#f5f7f6" }}>
            mgm<span style={{ color: "#6f7e76" }}>.fund</span>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid #18231e",
              background: "#0b110f",
              fontSize: 18,
              color: "#a8b3ad",
            }}
          >
            Arc · USDC-native
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 700, letterSpacing: -2.6, color: "#f5f7f6" }}>
            Rugged on Arc?
          </div>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 700, letterSpacing: -2.6, color: JADE }}>
            File the claim. Get paid back.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
          <Point n="1" title="Proof or it never happened" body="Screenshots are mandatory — no evidence, no claim" />
          <Point n="2" title="Signed by the wallet that lost it" body="Nobody can file on someone else's screenshot" />
          <Point n="3" title="100% of $MGM creator fees fund refunds" body={POOL_WALLET} />
        </div>
      </div>
    ),
    { width: 1200, height: 675 },
  );
}
