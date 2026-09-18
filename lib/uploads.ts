import "server-only";
import { randomBytes } from "node:crypto";
import { LIMITS } from "./validate";

/**
 * Proof screenshots go to Vercel Blob when a token is configured (production)
 * and to ./public/uploads otherwise, so a fresh clone runs with no accounts.
 * Stored paths are whatever the destination returns: an absolute Blob URL, or
 * a site-relative /uploads/… path. Both work straight in <img src>.
 */

const UPLOAD_DIR_SEGMENTS = ["public", "uploads"] as const;

/**
 * @vercel/blob authenticates either with a read-write token or, on Vercel, with
 * the OIDC token it injects plus the store id. Connecting a Blob store in the
 * dashboard gives you the second form, so requiring the token would reject a
 * perfectly wired deployment.
 */
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN;
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_STORE_ID);

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png",  mime: "image/png",  test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg",  mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif",  mime: "image/gif",  test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  { ext: "webp", mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export type SavedProof = { path: string; name: string | null; size: number };

export class UploadError extends Error {}

async function writeLocal(name: string, buf: Buffer): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), ...UPLOAD_DIR_SEGMENTS);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

async function writeBlob(name: string, buf: Buffer, mime: string): Promise<string> {
  const { put } = await import("@vercel/blob");
  const token = blobToken();
  const res = await put(`proofs/${name}`, buf, {
    access: "public",
    contentType: mime,
    addRandomSuffix: false,
    // omitted entirely when absent, so the SDK falls through to OIDC
    ...(token ? { token } : {}),
  });
  return res.url;
}

/**
 * Validates every file by magic bytes — the browser-reported mime type is
 * never trusted — then stores it.
 */
export async function saveProofs(files: File[]): Promise<SavedProof[]> {
  if (files.length > LIMITS.proofsMax) throw new UploadError(`Up to ${LIMITS.proofsMax} screenshots`);

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

      // a serverless host has no writable disk, so the local fallback cannot save us there
      if (!blobConfigured() && process.env.VERCEL) {
        throw new UploadError(
          "Screenshot storage is not configured on this deployment (Vercel → Storage → Blob).",
        );
      }

      const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${sig.ext}`;
      const path = blobConfigured() ? await writeBlob(name, buf, sig.mime) : await writeLocal(name, buf);
      saved.push({ path, name: file.name.slice(0, 120) || null, size: buf.length });
    }
  } catch (err) {
    await removeProofs(saved.map((s) => s.path));
    throw err;
  }
  return saved;
}

export async function removeProofs(paths: string[]): Promise<void> {
  const blobs = paths.filter((p) => /^https?:\/\//.test(p));
  const locals = paths.filter((p) => p.startsWith("/uploads/"));

  if (blobs.length) {
    try {
      const { del } = await import("@vercel/blob");
      const token = blobToken();
      await del(blobs, token ? { token } : undefined);
    } catch (err) {
      console.error("[mgm] could not delete blobs", err);
    }
  }

  if (locals.length) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), ...UPLOAD_DIR_SEGMENTS);
    await Promise.all(
      locals.map(async (p) => {
        const base = path.basename(p);
        if (base !== p.slice("/uploads/".length)) return; // reject traversal
        await fs.rm(path.join(dir, base), { force: true });
      }),
    );
  }
}
