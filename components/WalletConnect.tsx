"use client";

import { IconCheck, IconSpinner } from "./Icons";
import { shortAddr } from "@/lib/format";
import { SUPPORTED_WALLETS, type Connection, type DiscoveredWallet } from "@/lib/wallet";

interface Props {
  wallets: DiscoveredWallet[];
  connection: Connection | null;
  connecting: string | null;
  onConnect: (w: DiscoveredWallet) => void;
  onDisconnect: () => void;
}

export function WalletConnect({ wallets, connection, connecting, onConnect, onDisconnect }: Props) {
  if (connection) {
    return (
      <div className="wallet-connected">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={connection.icon} alt="" />
        <span style={{ minWidth: 0 }}>
          <span className="who">
            <IconCheck size={11} /> {connection.name} connected
          </span>
          <span className="addr">{shortAddr(connection.address, 10, 8)}</span>
        </span>
        <button type="button" className="drop" onClick={onDisconnect}>disconnect</button>
      </div>
    );
  }

  // wallets the browser announced (EIP-6963), preferring the ones MGM supports
  const known = new Set<string>(SUPPORTED_WALLETS.map((w) => w.rdns));
  const injected = [...wallets].sort((a, b) => Number(known.has(b.info.rdns)) - Number(known.has(a.info.rdns)));
  const missing = SUPPORTED_WALLETS.filter((w) => !wallets.some((x) => x.info.rdns === w.rdns));

  return (
    <div className="wallet-list">
      {injected.map((w) => (
        <button
          key={w.info.uuid}
          type="button"
          className="wallet-option"
          disabled={connecting !== null}
          onClick={() => onConnect(w)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.info.icon} alt="" />
          <span className="meta">
            <span>{w.info.name}</span>
            <span className="sub">{w.info.rdns}</span>
          </span>
          <span className="go">
            {connecting === w.info.rdns ? <IconSpinner size={13} /> : "connect ↗"}
          </span>
        </button>
      ))}

      {missing.map((w) => (
        <a
          key={w.rdns}
          className="wallet-option"
          data-install="true"
          href={w.install}
          target="_blank"
          rel="noreferrer noopener"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.icon} alt="" />
          <span className="meta">
            <span>{w.name}</span>
            <span className="sub">not detected in this browser</span>
          </span>
          <span className="go">install ↗</span>
        </a>
      ))}

      {!injected.length && !missing.length ? (
        <div className="empty" style={{ padding: "28px 16px" }}>No EVM wallet detected in this browser.</div>
      ) : null}
    </div>
  );
}
