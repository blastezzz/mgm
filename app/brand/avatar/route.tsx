import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const JADE = "#49edbf";
const INK = "#050807";

/** X / social avatar, 400×400. Downloaded once and committed to public/brand. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: INK,
          backgroundImage: "linear-gradient(135deg, rgba(73,237,191,0.16) 0%, rgba(5,8,7,0) 58%)",
        }}
      >
        <svg width="248" height="248" viewBox="0 0 32 32" fill="none">
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
      </div>
    ),
    { width: 400, height: 400 },
  );
}
