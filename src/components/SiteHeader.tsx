"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";
import { InvestorLevelSwitcher } from "./InvestorLevelProvider";

const NAV_LINKS = [
  { href: "/", label: "لوحة السوق" },
  { href: "/screener", label: "المرشِّح" },
  { href: "/compare", label: "المقارنة" },
  { href: "/backtest", label: "الاختبار التاريخي" },
  { href: "/ranking", label: "الترتيب التاريخي" },
  { href: "/portfolio", label: "المحفظة" },
  { href: "/alerts", label: "التنبيهات" },
  { href: "/glossary", label: "القاموس" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <BarChart3 className="h-5 w-5" />
            </span>
            <span className="text-sm sm:text-base">تحليل البورصة المصرية</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <InvestorLevelSwitcher />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
            aria-label="فتح القائمة"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile level switcher */}
      <div className="flex justify-center border-t border-slate-100 px-4 py-2 sm:hidden">
        <InvestorLevelSwitcher />
      </div>

      {open && (
        <nav
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
          aria-label="قائمة الموبايل"
        >
          <div className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
