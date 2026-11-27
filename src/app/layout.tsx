import type { Metadata } from "next";
import "./globals.css";
import { InvestorLevelProvider } from "@/components/InvestorLevelProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

export const metadata: Metadata = {
  title: "تحليل أسهم البورصة المصرية (EGX) — منصة تحليل كمي وتاريخي",
  description:
    "منصة عربية مفتوحة لتحليل أسهم البورصة المصرية (EGX) بالمؤشرات الفنية والاختبار التاريخي والترتيب المنهجي الشفاف.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <InvestorLevelProvider>
          <SiteHeader />
          <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-6">
            {children}
          </main>
          <DisclaimerFooter />
        </InvestorLevelProvider>
      </body>
    </html>
  );
}
