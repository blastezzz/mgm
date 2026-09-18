import type { Metadata } from "next";
import Link from "next/link";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "File a refund claim",
  description: "Post the contract, attach your proof and publish the case. Screenshots are mandatory.",
};

export default function SubmitPage() {
  return (
    <main className="page">
      <div className="shell" style={{ paddingTop: 40 }}>
        <div className="crumbs">
          <Link href="/">Claims</Link> <span>/</span> <span style={{ color: "var(--text-secondary)" }}>New claim</span>
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.03em", margin: "0 0 12px", fontWeight: 600 }}>
          File a refund claim
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6, maxWidth: "68ch", margin: "0 0 32px" }}>
          One case per claim. Name the contract, show what you lost, attach the screenshots. Claims without
          proof are not published — that rule is what makes the ones here worth reading.
        </p>

        <SubmitForm />
      </div>
    </main>
  );
}
