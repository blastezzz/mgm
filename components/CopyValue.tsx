"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "./Icons";

export function CopyValue({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch { /* clipboard blocked */ }
  }

  return (
    <button type="button" className="copy" onClick={copy} title={value} aria-label={`Copy ${label ?? value}`}>
      <span>{label ?? value}</span>
      {done ? <IconCheck /> : <IconCopy />}
    </button>
  );
}
