"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

export interface WalletInfo {
  uuid: string;
  name: string;
  /** data: URI supplied by the extension itself */
  icon: string;
  rdns: string;
}

export interface DiscoveredWallet {
  info: WalletInfo;
  provider: EIP1193Provider;
}

/** Wallets MGM promotes when they are not installed yet. */
export const SUPPORTED_WALLETS = [
  { rdns: "io.metamask", name: "MetaMask", icon: "/wallets/metamask.png", install: "https://metamask.io/download/" },
  { rdns: "io.rabby",    name: "Rabby",    icon: "/wallets/rabby.png",    install: "https://rabby.io/" },
] as const;

/* ------------------------------------------------------------------ *
 * EIP-6963 discovery — every injected wallet announces itself with a
 * name and its own icon, so the connect sheet always shows real brands.
 * ------------------------------------------------------------------ */

const EMPTY: DiscoveredWallet[] = [];
let discovered: DiscoveredWallet[] = EMPTY;
const listeners = new Set<() => void>();
let started = false;

function emit() { listeners.forEach((l) => l()); }

function startDiscovery() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = (event as CustomEvent<DiscoveredWallet>).detail;
    if (!detail?.info?.rdns || discovered.some((w) => w.info.rdns === detail.info.rdns)) return;
    discovered = [...discovered, detail];
    emit();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function subscribe(fn: () => void) {
  startDiscovery();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useDiscoveredWallets(): DiscoveredWallet[] {
  return useSyncExternalStore(subscribe, () => discovered, () => EMPTY);
}

/* ------------------------------------------------------------------ *
 * Connection
 * ------------------------------------------------------------------ */

export interface Connection {
  address: string;
  name: string;
  icon: string;
  rdns: string;
}

const LAST_WALLET = "mgm:wallet";

function utf8ToHex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export class WalletError extends Error {}

function readableError(err: unknown): string {
  const e = err as { code?: number; message?: string };
  if (e?.code === 4001) return "Signature rejected in your wallet";
  if (e?.code === -32002) return "Your wallet already has a pending request — open it";
  return e?.message ?? "Wallet request failed";
}

export function useWallet() {
  const wallets = useDiscoveredWallets();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<EIP1193Provider | null>(null);

  // reconnect silently to the wallet used last time (no popup: eth_accounts only)
  useEffect(() => {
    let cancelled = false;
    async function resume() {
      let last: string | null = null;
      try { last = localStorage.getItem(LAST_WALLET); } catch { /* storage blocked */ }
      if (!last) return;
      const w = wallets.find((x) => x.info.rdns === last);
      if (!w) return;
      try {
        const accounts = (await w.provider.request({ method: "eth_accounts" })) as string[];
        if (cancelled || !accounts?.length) return;
        providerRef.current = w.provider;
        setConnection({ address: accounts[0].toLowerCase(), name: w.info.name, icon: w.info.icon, rdns: w.info.rdns });
      } catch { /* wallet locked */ }
    }
    void resume();
    return () => { cancelled = true; };
  }, [wallets]);

  // follow account switches inside the wallet
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider?.on || !connection) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts?.length) {
        setConnection(null);
        providerRef.current = null;
      } else {
        setConnection((prev) => (prev ? { ...prev, address: accounts[0].toLowerCase() } : prev));
      }
    };
    provider.on("accountsChanged", onAccounts);
    return () => provider.removeListener?.("accountsChanged", onAccounts);
  }, [connection]);

  const connect = useCallback(async (wallet: DiscoveredWallet) => {
    setConnecting(wallet.info.rdns);
    setError(null);
    try {
      const accounts = (await wallet.provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new WalletError("No account was shared");
      providerRef.current = wallet.provider;
      try { localStorage.setItem(LAST_WALLET, wallet.info.rdns); } catch { /* ignore */ }
      setConnection({
        address: accounts[0].toLowerCase(),
        name: wallet.info.name,
        icon: wallet.info.icon,
        rdns: wallet.info.rdns,
      });
    } catch (err) {
      setError(readableError(err));
    } finally {
      setConnecting(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    providerRef.current = null;
    setConnection(null);
    try { localStorage.removeItem(LAST_WALLET); } catch { /* ignore */ }
  }, []);

  /** personal_sign over the claim text. Throws WalletError with a readable message. */
  const sign = useCallback(async (message: string): Promise<string> => {
    const provider = providerRef.current;
    if (!provider || !connection) throw new WalletError("Connect a wallet first");
    try {
      const sig = (await provider.request({
        method: "personal_sign",
        params: [utf8ToHex(message), connection.address],
      })) as string;
      if (typeof sig !== "string" || !sig.startsWith("0x")) throw new WalletError("Wallet returned an unreadable signature");
      return sig;
    } catch (err) {
      throw new WalletError(readableError(err));
    }
  }, [connection]);

  return { wallets, connection, connect, disconnect, sign, connecting, error, setError };
}
