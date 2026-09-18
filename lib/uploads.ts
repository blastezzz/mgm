import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { LIMITS } from "./validate";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png",  mime: "image/png",  test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg",  mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif",  mime: "image/gif",  test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  { ext: "webp", mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export type SavedProof = { path: string; name: string | null; size: number };

export class UploadError extends Error {}

/**
 * Writes proof screenshots to /public/uploads. Every file is sniffed by magic
 * bytes — the browser-reported mime type is never trusted.
 */
export async function saveProofs(files: File[]): Promise<SavedProof[]> {
  if (files.length > LIMITS.proofsMax) throw new UploadError(`Up to ${LIMITS.proofsMax} screenshots`);
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const saved: SavedProof[] = [];
  try {
    for (const file of files) {
      if (file.size > LIMITS.proofBytes) {
        throw new UploadError(`"${file.name}" is larger than ${Math.round(LIMITS.proofBytes / 1024 / 1024)}MB`);
      }
      if (file.size === 0) throw new UploadError(`"${file.name}" is empty`);

      const buf = Buffer.from(await file.arrayBuffer());
      const sig = SIGNATURES.find((s) => s.test(buf));
      if (!sig) throw new UploadError(`"${file.name}" is not a PNG, JPG, WEBP or GIF image`);

      const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${sig.ext}`;
      await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
      saved.push({ path: `/uploads/${name}`, name: file.name.slice(0, 120) || null, size: buf.length });
    }
  } catch (err) {
    await removeProofs(saved.map((s) => s.path));
    throw err;
  }
  return saved;
}

export async function removeProofs(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (p) => {
      const base = path.basename(p);
      if (!p.startsWith("/uploads/") || base !== p.slice("/uploads/".length)) return;
      await fs.rm(path.join(UPLOAD_DIR, base), { force: true });
    }),
  );
}
