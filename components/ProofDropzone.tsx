"use client";

import { useCallback, useRef, useState } from "react";
import { IconClose, IconUpload } from "./Icons";
import { LIMITS } from "@/lib/validate";

export interface PickedProof {
  file: File;
  url: string;
  key: string;
}

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MB = LIMITS.proofBytes / 1024 / 1024;

export function ProofDropzone({
  proofs,
  onChange,
  invalid,
  onReject,
}: {
  proofs: PickedProof[];
  onChange: (next: PickedProof[]) => void;
  invalid?: boolean;
  onReject?: (message: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const next: PickedProof[] = [];
      for (const file of incoming) {
        if (!ACCEPT.includes(file.type)) {
          onReject?.(`"${file.name}" is not a PNG, JPG, WEBP or GIF`);
          continue;
        }
        if (file.size > LIMITS.proofBytes) {
          onReject?.(`"${file.name}" is over ${MB}MB`);
          continue;
        }
        if (proofs.length + next.length >= LIMITS.proofsMax) {
          onReject?.(`Up to ${LIMITS.proofsMax} screenshots per claim`);
          break;
        }
        next.push({ file, url: URL.createObjectURL(file), key: `${file.name}-${file.size}-${Math.random()}` });
      }
      if (next.length) onChange([...proofs, ...next]);
    },
    [onChange, onReject, proofs],
  );

  return (
    <div>
      <div
        className="dropzone"
        data-drag={drag}
        data-invalid={invalid ? "true" : undefined}
        aria-describedby={invalid ? "proof-error" : undefined}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); }}
      >
        <div className="dropzone-icon"><IconUpload /></div>
        <strong>
          Drop your screenshots here — <em>proof is mandatory</em>
        </strong>
        <p>PNG · JPG · WEBP · GIF — up to {LIMITS.proofsMax} files, {MB}MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          multiple
          hidden
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }}
        />
      </div>

      {proofs.length > 0 && (
        <div className="proofs">
          {proofs.map((p) => (
            <div className="proof" key={p.key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.file.name} />
              <button
                type="button"
                aria-label={`Remove ${p.file.name}`}
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  onChange(proofs.filter((x) => x.key !== p.key));
                }}
              >
                <IconClose />
              </button>
              <span className="nm">{p.file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
