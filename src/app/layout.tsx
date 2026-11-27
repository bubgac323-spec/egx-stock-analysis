import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "تحليل أسهم البورصة المصرية (EGX)",
  description:
    "منصة عربية بسيطة لمتابعة وفهم حركة أسهم البورصة المصرية وتاريخ أسعارها ومقارنتها.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SiteHeader />
        <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-6">
          {children}
        </main>
        <DisclaimerFooter />
      </body>
    </html>
  );
}
