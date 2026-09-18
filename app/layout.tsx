import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MGM — Minara Get My Money | File a refund claim for a rugged token",
    template: "%s · mgm.fund",
  },
  description:
    "Minara Get My Money is the public claim book for capital rugged on Minara. Post your case, attach proof, sign with the wallet that took the loss.",
  openGraph: {
    title: "MGM — Minara Get My Money",
    description: "The public claim book for tokens rugged on Minara. File your case with proof.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#050807" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${geist.variable} ${geistMono.variable}`}>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
