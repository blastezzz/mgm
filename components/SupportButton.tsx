"use client";

import { useState } from "react";
import { IconArrowUp, IconCheck, IconSpinner } from "./Icons";
import { markBacked, useHasBacked } from "@/lib/clientStore";
import { SUPPORT_THRESHOLD } from "@/lib/types";

export function SupportButton({ id, initial }: { id: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [busy, setBusy] = useState(false);
  const backed = useHasBacked(id);

  async function back() {
    if (backed || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${id}/support`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { supports?: number };
      if (res.ok && typeof data.supports === "number") {
        setCount(data.supports);
        markBacked(id);
      }
    } catch {
      /* offline — the claim simply stays unbacked */
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.min(100, Math.round((count / SUPPORT_THRESHOLD) * 100));

  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={back} disabled={backed || busy}>
        {busy ? <IconSpinner /> : backed ? <IconCheck /> : <IconArrowUp />}
        {backed ? "You backed this claim" : "I can vouch for this"}
      </button>

      <div style={{ marginTop: 14 }}>
        <div className="bar" style={{ borderRadius: 999 }}>
          <i style={{ width: `${pct}%`, borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "var(--font-data)", fontSize: 11.5, color: "var(--text-tertiary)" }}>
          <span><b style={{ color: "var(--jade-500)", fontWeight: 500 }}>{count}</b> backing</span>
          <span>{SUPPORT_THRESHOLD} to escalate</span>
        </div>
      </div>
    </div>
  );
}
