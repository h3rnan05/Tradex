"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { es } from "@/translations/es";
import { en } from "@/translations/en";

export type Lang = "es" | "en";

type Dict = typeof es;

interface I18nCtx {
  lang: Lang;
  t: (key: keyof Dict) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nCtx>({
  lang: "es",
  t: (k) => k as string,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem("tradex_lang") as Lang | null;
    if (saved === "en" || saved === "es") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("tradex_lang", l);
  }

  function t(key: keyof Dict): string {
    const dict: Dict = lang === "en" ? (en as unknown as Dict) : es;
    return (dict[key] as string) ?? (key as string);
  }

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}

export function useLanguage() {
  return useContext(I18nContext);
}
