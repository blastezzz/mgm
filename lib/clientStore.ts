"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny external store over Web Storage. Reading through useSyncExternalStore
 * keeps SSR output and the first client render in sync — no setState in effects,
 * no hydration mismatch — and every access is guarded for private/blocked storage.
 */
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (typeof window !== "undefined") window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", fn);
  };
}

function emit() { listeners.forEach((fn) => fn()); }

function read(store: "local" | "session", key: string): string | null {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(store: "local" | "session", key: string, value: string) {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch { /* storage unavailable */ }
  emit();
}

/** A stored value restricted to a known set of options. */
export function useStoredOption<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const raw = read("local", key);
      return allowed.includes(raw as T) ? (raw as T) : fallback;
    },
    () => fallback,
  );
  const set = useCallback((next: T) => write("local", key, next), [key]);
  return [value, set];
}

const BACKED_KEY = "mgm:backed";

function backedList(): string[] {
  try {
    const parsed = JSON.parse(read("local", BACKED_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Whether this browser already backed a given claim. */
export function useHasBacked(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => backedList().includes(id),
    () => false,
  );
}

export function markBacked(id: string) {
  write("local", BACKED_KEY, JSON.stringify([...new Set([...backedList(), id])]));
}

const ADMIN_KEY = "mgm:adminkey";

export function useStoredAdminKey(): string {
  return useSyncExternalStore(subscribe, () => read("session", ADMIN_KEY) ?? "", () => "");
}

export function storeAdminKey(key: string) { write("session", ADMIN_KEY, key); }
