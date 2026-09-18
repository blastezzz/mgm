"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ProofDropzone, type PickedProof } from "./ProofDropzone";
import { WalletConnect } from "./WalletConnect";
import { IconCheck, IconShield, IconSpinner } from "./Icons";
import { LIMITS, validateDraft, type Errors } from "@/lib/validate";
import { CATEGORIES, SUPPORT_EMAIL, type Category } from "@/lib/types";
import { claimMessage, normalizeAmount } from "@/lib/signing";
import { useWallet, WalletError } from "@/lib/wallet";
import { usd } from "@/lib/format";

const EMPTY = {
  projectName: "",
  ticker: "",
  contract: "",
  amountUsd: "",
  category: "rug_pull" as Category,
  story: "",
  txHash: "",
  evidenceUrl: "",
  contact: "",
  reporter: "",
};

type Phase = "idle" | "signing" | "uploading";

export function SubmitForm() {
  const router = useRouter();
  const { wallets, connection, connect, disconnect, sign, connecting, error: walletError } = useWallet();
  const [f, setF] = useState(EMPTY);
  const [proofs, setProofs] = useState<PickedProof[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = phase !== "idle";

  function flash(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof Errors]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const draft = useMemo(
    () => ({ ...f, confirmed, proofCount: proofs.length, walletAddress: connection?.address ?? "" }),
    [f, confirmed, proofs.length, connection],
  );

  const amountNum = normalizeAmount(f.amountUsd);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      flash("err", found.walletAddress ?? "Some fields still need attention");
      document.querySelector('[aria-invalid="true"], [data-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!connection) return;

    const contract = f.contract.trim().toLowerCase();

    try {
      /* 1 — challenge from the server */
      setPhase("signing");
      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: connection.address }),
      });
      const challenge = (await nonceRes.json().catch(() => ({}))) as { nonce?: string; issuedAt?: number; error?: string };
      if (!nonceRes.ok || !challenge.nonce || !challenge.issuedAt) {
        flash("err", challenge.error ?? "Could not start the signature");
        setPhase("idle");
        return;
      }

      /* 2 — the wallet signs the claim */
      const signature = await sign(
        claimMessage({
          address: connection.address,
          contract,
          amountUsd: amountNum,
          proofCount: proofs.length,
          nonce: challenge.nonce,
          issuedAt: challenge.issuedAt,
        }),
      );

      /* 3 — publish */
      setPhase("uploading");
      const fd = new FormData();
      Object.entries({ ...f, contract }).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append("confirmed", "true");
      fd.append("walletAddress", connection.address);
      fd.append("signature", signature);
      fd.append("nonce", challenge.nonce);
      proofs.forEach((p) => fd.append("proofs", p.file, p.file.name));

      const res = await fetch("/api/cases", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; errors?: Errors };

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        flash("err", data.error ?? "Could not file the claim");
        setPhase("idle");
        return;
      }

      flash("ok", "Claim signed and published");
      proofs.forEach((p) => URL.revokeObjectURL(p.url));
      router.push(`/case/${data.id}?new=1`);
    } catch (err) {
      flash("err", err instanceof WalletError ? err.message : "Network error — your claim was not filed");
      setPhase("idle");
    }
  }

  const checklist = [
    { done: !!connection, text: "Wallet connected" },
    { done: f.projectName.trim().length >= 2 && f.contract.trim().length > 5, text: "Project name and contract address" },
    { done: amountNum > 0, text: "Amount lost in USD" },
    { done: f.story.trim().length >= LIMITS.storyMin, text: `Your story (${LIMITS.storyMin}+ characters)` },
    { done: proofs.length > 0, text: "At least one screenshot as proof" },
    { done: confirmed, text: "Truthfulness confirmed" },
  ];

  return (
    <form className="form-layout" onSubmit={submit} noValidate>
      <div>
        {/* ------------------------------------------------ wallet */}
        <div className="panel">
          <h2 className="panel-title">
            <span className="n">1</span> Connect the wallet that took the loss
          </h2>

          <WalletConnect
            wallets={wallets}
            connection={connection}
            connecting={connecting}
            onConnect={(w) => { setErrors((p) => ({ ...p, walletAddress: undefined })); void connect(w); }}
            onDisconnect={disconnect}
          />

          {errors.walletAddress ? <div className="err" style={{ marginTop: 10 }}>{errors.walletAddress}</div> : null}
          {walletError ? <div className="err" style={{ marginTop: 10 }}>{walletError}</div> : null}

          <div className="hint" style={{ marginTop: 14 }}>
            You sign a plain text message to prove the wallet is yours — no transaction, no gas, no
            token approval. The refund goes to this same address, so someone else&apos;s PnL screenshot
            gets them nowhere.
          </div>
        </div>

        {/* ------------------------------------------------ the project */}
        <div className="panel">
          <h2 className="panel-title"><span className="n">2</span> What burned you</h2>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="projectName">Token / project name <span className="req">*</span></label>
              <input
                id="projectName" className="input" value={f.projectName}
                onChange={(e) => set("projectName", e.target.value)}
                aria-invalid={!!errors.projectName} maxLength={LIMITS.projectName}
                placeholder="e.g. Minara CAT"
              />
              {errors.projectName && <div className="err">{errors.projectName}</div>}
            </div>

            <div className="field">
              <label className="label" htmlFor="ticker">Ticker <span className="opt">optional</span></label>
              <input
                id="ticker" className="input mono" value={f.ticker}
                onChange={(e) => set("ticker", e.target.value)}
                aria-invalid={!!errors.ticker} maxLength={LIMITS.ticker}
                placeholder="MCAT"
              />
              {errors.ticker && <div className="err">{errors.ticker}</div>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Network</label>
              <span className="chain-lock">
                <b>Arc</b> · USDC-native
                <span className="lockicon">fixed</span>
              </span>
              <div className="hint">MGM only takes claims against tokens launched on Arc.</div>
            </div>

            <div className="field">
              <label className="label" htmlFor="category">What happened <span className="req">*</span></label>
              <select id="category" className="select" value={f.category} onChange={(e) => set("category", e.target.value as Category)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="contract">Contract address <span className="req">*</span></label>
            <input
              id="contract" className="input mono" value={f.contract}
              onChange={(e) => set("contract", e.target.value)}
              aria-invalid={!!errors.contract} maxLength={LIMITS.contract}
              placeholder="0x0000000000000000000000000000000000000000"
              spellCheck={false}
            />
            {errors.contract ? <div className="err">{errors.contract}</div>
              : <div className="hint">The exact CA you bought. Wrong address = claim gets rejected.</div>}
          </div>
        </div>

        {/* ------------------------------------------------ the loss */}
        <div className="panel">
          <h2 className="panel-title"><span className="n">3</span> The loss</h2>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="amountUsd">Amount lost in USD <span className="req">*</span></label>
              <div className="input-affix">
                <span className="affix">$</span>
                <input
                  id="amountUsd" className="input mono" inputMode="decimal" value={f.amountUsd}
                  onChange={(e) => set("amountUsd", e.target.value.replace(/[^\d.,]/g, ""))}
                  aria-invalid={!!errors.amountUsd} placeholder="1000"
                />
              </div>
              {errors.amountUsd ? <div className="err">{errors.amountUsd}</div>
                : <div className="hint">{amountNum > 0 ? `= ${usd(amountNum, false)} — this figure is part of what you sign` : "Enter what you actually lost, not what you hoped to make."}</div>}
            </div>

            <div className="field">
              <label className="label" htmlFor="txHash">Buy / sale tx hash <span className="opt">optional</span></label>
              <input
                id="txHash" className="input mono" value={f.txHash}
                onChange={(e) => set("txHash", e.target.value)}
                aria-invalid={!!errors.txHash} maxLength={LIMITS.txHash}
                placeholder="0x…" spellCheck={false}
              />
              {errors.txHash ? <div className="err">{errors.txHash}</div>
                : <div className="hint">On-chain proof makes a claim far harder to dismiss.</div>}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="story">
              Your case <span className="req">*</span>
              <span className="counter">{f.story.length}/{LIMITS.story}</span>
            </label>
            <textarea
              id="story" className="textarea" value={f.story}
              onChange={(e) => set("story", e.target.value.slice(0, LIMITS.story))}
              aria-invalid={!!errors.story}
              placeholder={"gm. I aped into this token at the CA above, the team promised a CEX listing and a marketing push.\n\nThree days later the dev sold his whole bag, locked the TG and deleted the site. I lost $1,000. Screens of the tx and the deleted channel are attached."}
            />
            {errors.story ? <div className="err">{errors.story}</div>
              : <div className="hint">Dates, wallets, promises made, what actually happened. Facts beat adjectives.</div>}
          </div>
        </div>

        {/* ------------------------------------------------ proof */}
        <div className="panel">
          <h2 className="panel-title"><span className="n">4</span> Proof <span style={{ color: "var(--jade-500)" }}>— required</span></h2>
          <ProofDropzone
            proofs={proofs}
            onChange={(next) => { setProofs(next); if (errors.proofCount) setErrors((p) => ({ ...p, proofCount: undefined })); }}
            invalid={!!errors.proofCount}
            onReject={(m) => flash("err", m)}
          />
          {errors.proofCount ? <div className="err" id="proof-error">{errors.proofCount}</div>
            : <div className="hint">Wallet screen, tx on the explorer, chat with the team, the deleted socials — anything that shows the loss is real. The number of files is part of the signed message.</div>}
        </div>

        {/* ------------------------------------------------ extras */}
        <div className="panel">
          <h2 className="panel-title"><span className="n">5</span> Optional details</h2>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="reporter">Display name <span className="opt">optional</span></label>
              <input
                id="reporter" className="input" value={f.reporter}
                onChange={(e) => set("reporter", e.target.value)}
                aria-invalid={!!errors.reporter} maxLength={LIMITS.reporter}
                placeholder="anon"
              />
              {errors.reporter && <div className="err">{errors.reporter}</div>}
            </div>

            <div className="field">
              <label className="label" htmlFor="contact">Contact <span className="opt">optional</span></label>
              <input
                id="contact" className="input" value={f.contact}
                onChange={(e) => set("contact", e.target.value)}
                aria-invalid={!!errors.contact} maxLength={LIMITS.contact}
                placeholder="@handle on X or Telegram"
              />
              {errors.contact && <div className="err">{errors.contact}</div>}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="evidenceUrl">Evidence link <span className="opt">optional</span></label>
            <input
              id="evidenceUrl" className="input mono" value={f.evidenceUrl}
              onChange={(e) => set("evidenceUrl", e.target.value)}
              aria-invalid={!!errors.evidenceUrl} maxLength={LIMITS.url}
              placeholder="https://x.com/… or explorer link" spellCheck={false}
            />
            {errors.evidenceUrl && <div className="err">{errors.evidenceUrl}</div>}
          </div>
        </div>

        {/* ------------------------------------------------ confirm */}
        <div className="panel">
          <label className="check" style={{ marginBottom: 20 }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setErrors((p) => ({ ...p, confirmed: undefined })); }} />
            <span>
              Everything in this claim is true, the screenshots are mine and unedited, and I understand
              the claim is published publicly along with the contract address and my wallet.
            </span>
          </label>
          {errors.confirmed && <div className="err" style={{ marginBottom: 14 }}>{errors.confirmed}</div>}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {phase === "signing" ? <><IconSpinner /> Confirm the signature in your wallet…</>
              : phase === "uploading" ? <><IconSpinner /> Publishing claim…</>
              : connection ? "Sign & publish my claim ↗" : "Connect a wallet to file ↗"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ side rail */}
      <aside className="sticky">
        <div className="panel">
          <h2 className="panel-title">Live preview</h2>
          <div className="card" style={{ pointerEvents: "none" }}>
            <div className="card-media">
              {proofs[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={proofs[0].url} alt="" />
              ) : (
                <div style={{ display: "grid", placeItems: "center", height: "100%", fontFamily: "var(--font-data)", fontSize: 11.5, color: "var(--text-tertiary)", textAlign: "center", padding: 16 }}>
                  your proof screenshot<br />appears here
                </div>
              )}
              <div className="card-media-top">
                <span className="rank">NEW</span>
                <span className="card-age">now</span>
              </div>
              <div className="card-media-bottom"><span className="status" data-s="pending">Awaiting review</span></div>
              <div className="bar on-media"><i style={{ width: "0%" }} /></div>
            </div>
            <div className="card-body">
              <h3 className="card-title">{f.projectName || "Unnamed project"}{f.ticker ? ` · ${f.ticker.toUpperCase()}` : ""}</h3>
              <div className="card-meta">
                <span className="k">Lost</span>
                <span className="v">{usd(amountNum)}</span>
                <span className="tag" style={{ marginLeft: "auto" }}>
                  {CATEGORIES.find((c) => c.value === f.category)?.label}
                </span>
              </div>
              <div className="card-ca">
                Arc · {f.contract ? `${f.contract.slice(0, 8)}…${f.contract.slice(-6)}` : "contract address"}
              </div>
              <div className="card-foot"><span>▲ 0 backing</span><span>{proofs.length} proof{proofs.length === 1 ? "" : "s"}</span></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Before you publish</h2>
          <div className="kv">
            {checklist.map((c) => (
              <div key={c.text} className="kv-item" style={{ alignItems: "center", gap: 10 }}>
                <span style={{ color: c.done ? "var(--jade-500)" : "var(--neutral-600)", display: "flex" }}>
                  {c.done ? <IconCheck size={13} /> : <span style={{ width: 13, height: 13, border: "1px solid currentColor", borderRadius: 3, display: "block" }} />}
                </span>
                <span style={{ marginRight: "auto", textAlign: "left", color: c.done ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12 }}>
                  {c.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="notice warn" style={{ marginTop: 16 }}>
          <span style={{ color: "var(--signal-amber)", flex: "none", marginTop: 2 }}><IconShield /></span>
          <span>
            <b>MGM never asks for a transaction.</b> Filing a claim costs one signature and nothing
            else. Never share a seed phrase, and never approve a token spend to &ldquo;recover&rdquo; funds.
            Stuck? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--jade-500)" }}>{SUPPORT_EMAIL}</a>
          </span>
        </div>
      </aside>

      {toast && <div className="toast" data-kind={toast.kind} role="status">{toast.text}</div>}
    </form>
  );
}
