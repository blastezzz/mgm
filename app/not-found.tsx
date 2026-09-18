import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="shell" style={{ paddingTop: 120, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-data)", color: "var(--jade-500)", marginBottom: 12 }}>404</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
          No claim at this address
        </h1>
        <p style={{ color: "var(--text-tertiary)", marginBottom: 30 }}>
          The claim was removed, or that ID never existed.
        </p>
        <Link className="btn btn-primary btn-lg" href="/">Back to the claim book</Link>
      </div>
    </main>
  );
}
