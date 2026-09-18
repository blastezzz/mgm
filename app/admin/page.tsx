"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { IconSpinner } from "@/components/Icons";
import { ago, usd } from "@/lib/format";
import { storeAdminKey, useStoredAdminKey } from "@/lib/clientStore";
import { STATUS_LABEL, STATUS_ORDER, type CaseStatus, type RefundCase } from "@/lib/types";

export default function AdminPage() {
  const stored = useStoredAdminKey();
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const keyField = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<RefundCase[]>([]);
  const [filter, setFilter] = useState<CaseStatus | "all">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (adminKey: string, status: CaseStatus | "all") => {
    try {
      const res = await fetch(`/api/admin/cases?status=${status}`, { headers: { "x-mgm-admin": adminKey } });
      if (res.status === 401) { setAuthed(false); setMsg("Wrong admin key"); return; }
      const data = (await res.json()) as { items: RefundCase[] };
      setItems(data.items);
      setKey(adminKey);
      setAuthed(true);
      setMsg(null);
      storeAdminKey(adminKey);
    } catch {
      setMsg("Could not reach the API");
    }
  }, []);

  async function unlock(adminKey: string, status: CaseStatus | "all") {
    setBusy(true);
    await load(adminKey, status);
    setBusy(false);
  }

  async function patch(id: string, status: CaseStatus, note: string) {
    const res = await fetch(`/api/admin/cases/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-mgm-admin": key },
      body: JSON.stringify({ status, note: note || undefined }),
    });
    if (res.ok) {
      const { case: updated } = (await res.json()) as { case: RefundCase };
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setMsg(`${id} → ${STATUS_LABEL[status]}`);
    } else {
      setMsg("Update failed");
    }
  }

  async function remove(id: string) {
    if (!confirm(`Delete ${id} and its screenshots? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/cases/${id}`, { method: "DELETE", headers: { "x-mgm-admin": key } });
    if (res.ok) { setItems((prev) => prev.filter((c) => c.id !== id)); setMsg(`${id} deleted`); }
    else setMsg("Delete failed");
  }

  if (!authed) {
    return (
      <main className="page">
        <div className="shell" style={{ paddingTop: 80, maxWidth: 420 }}>
          <div className="panel">
            <h2 className="panel-title">Moderation access</h2>
            <form onSubmit={(e) => { e.preventDefault(); void unlock(keyField.current?.value ?? "", filter); }}>
              <div className="field">
                <label className="label" htmlFor="k">Admin key</label>
                <input id="k" ref={keyField} className="input mono" type="password" defaultValue={stored} placeholder="MGM_ADMIN_KEY" />
                {msg && <div className="err">{msg}</div>}
              </div>
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? <IconSpinner /> : null} Unlock
              </button>
            </form>
            <p className="hint" style={{ marginTop: 16 }}>
              {stored ? "Key remembered for this tab — press Unlock to continue. " : null}
              Set <code style={{ color: "var(--jade-300)" }}>MGM_ADMIN_KEY</code> in .env.local to enable moderation.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell" style={{ paddingTop: 36 }}>
        <div className="section-head">
          <h1 className="section-title">Moderation · {items.length} claims</h1>
          <Link className="section-note" href="/">back to site ›</Link>
        </div>

        <div className="board-toolbar">
          {(["all", ...STATUS_ORDER] as (CaseStatus | "all")[]).map((s) => (
            <button
              key={s}
              className="pill"
              data-active={filter === s}
              onClick={() => { setFilter(s); void load(key, s); }}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
          {msg ? <span className="section-note" style={{ marginLeft: "auto" }}>{msg}</span> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((c) => (
            <AdminRow key={c.id} c={c} onSave={patch} onDelete={remove} />
          ))}
          {!items.length && <div className="empty">Nothing here.</div>}
        </div>
      </div>
    </main>
  );
}

function AdminRow({
  c, onSave, onDelete,
}: {
  c: RefundCase;
  onSave: (id: string, status: CaseStatus, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<CaseStatus>(c.status);
  const [note, setNote] = useState(c.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {c.proofs[0] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="row-thumb" style={{ width: 60, height: 60 }} src={c.proofs[0].path} alt="" />
        ) : null}

        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <Link href={`/case/${c.id}`} className="row-title" style={{ display: "block" }}>
            {c.projectName} {c.ticker ? `· ${c.ticker}` : ""}
          </Link>
          <div className="row-ca">{c.id} · {c.contract}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, fontFamily: "var(--font-data)", fontSize: 11.5, color: "var(--text-tertiary)" }}>
            <span style={{ color: "var(--loss)" }}>−{usd(c.amountUsd)}</span>
            <span>▲ {c.supports}</span>
            <span>{c.proofs.length} proofs</span>
            <span>{ago(c.createdAt)} ago</span>
            <StatusBadge status={c.status} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select className="select" style={{ width: 160, height: 34, fontSize: 12 }} value={status} onChange={(e) => setStatus(e.target.value as CaseStatus)}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <input className="input" style={{ width: 220, height: 34, fontSize: 12 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reviewer note (optional)" />
          <button
            className="btn btn-ghost btn-sm"
            disabled={saving}
            onClick={async () => { setSaving(true); await onSave(c.id, status, note); setSaving(false); }}
          >
            {saving ? <IconSpinner size={12} /> : null} Save
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => void onDelete(c.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}
