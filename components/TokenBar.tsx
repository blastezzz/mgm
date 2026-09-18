"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "./Icons";

/**
 * The $MGM contract line. Until the token launches the address is unset, so the
 * bar says so rather than showing a placeholder somebody could copy by mistake.
 */
export function TokenBar({ contract, chartUrl }: { contract: string | null; chartUrl: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!contract) return;
    try {
      await navigator.clipboard.writeText(contract);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="token-bar">
      <span className="tick">$MGM</span>

      {contract ? (
        <button type="button" className="ca" onClick={copy} title={contract} aria-label="Copy the $MGM contract address">
          <span>{contract}</span>
          {copied ? <IconCheck /> : <IconCopy />}
        </button>
      ) : (
        <span className="ca" data-pending="true">CA drops at launch</span>
      )}

      <span className="note">
        <b>100%</b> of creator fees from $MGM volume funds the refund pool
      </span>

      {contract && chartUrl ? (
        <a className="btn btn-ghost btn-sm grow" href={chartUrl} target="_blank" rel="noreferrer noopener">
          Chart ↗
        </a>
      ) : null}
    </div>
  );
}
