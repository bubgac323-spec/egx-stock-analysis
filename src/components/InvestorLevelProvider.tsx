"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type InvestorLevel = "beginner" | "intermediate" | "expert";

const STORAGE_KEY = "egx_investor_level";

interface InvestorLevelContextValue {
  level: InvestorLevel;
  setLevel: (level: InvestorLevel) => void;
}

const InvestorLevelContext = createContext<InvestorLevelContextValue>({
  level: "beginner",
  setLevel: () => {},
});

export function InvestorLevelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [level, setLevelState] = useState<InvestorLevel>("beginner");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as InvestorLevel | null;
      if (saved === "beginner" || saved === "intermediate" || saved === "expert") {
        setLevelState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLevel = (next: InvestorLevel) => {
    setLevelState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <InvestorLevelContext.Provider value={{ level, setLevel }}>
      {children}
    </InvestorLevelContext.Provider>
  );
}

export function useInvestorLevel() {
  return useContext(InvestorLevelContext);
}

const LEVELS: { id: InvestorLevel; label: string; hint: string }[] = [
  { id: "beginner", label: "مبتدئ", hint: "عرض مبسّط مع شروح وتلميحات" },
  { id: "intermediate", label: "متوسط", hint: "المؤشرات الأساسية والإحصاءات" },
  { id: "expert", label: "خبير", hint: "كامل المعاملات والجداول والتصدير" },
];

export function InvestorLevelSwitcher() {
  const { level, setLevel } = useInvestorLevel();
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs"
      role="group"
      aria-label="مستوى العرض"
    >
      {LEVELS.map((item) => {
        const active = level === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            onClick={() => setLevel(item.id)}
            className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
              active
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
