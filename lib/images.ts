/**
 * Proofs are user uploads (PNG/JPG/WEBP/GIF) plus SVG mock-ups from the seeder.
 * Next's optimiser refuses SVG unless dangerouslyAllowSVG is on — which would
 * let a stored SVG run script on our origin — so SVGs are served untouched and
 * everything else goes through the optimiser.
 */
export function isVectorProof(path: string): boolean {
  return path.toLowerCase().split("?")[0].endsWith(".svg");
}
