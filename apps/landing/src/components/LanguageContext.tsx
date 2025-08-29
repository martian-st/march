"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ca";

type Translations = Record<string, Record<Lang, string>>;

const translations: Translations = {
  // Hero
  "hero.title.line1": {
    en: "second brain for people living",
    ca: "segon cervell per a persones que viuen",
  },
  "hero.title.line2": {
    en: "on mars",
    ca: "a Mart",
  },
  "hero.subtitle": {
    en: "write, plan or capture action items from connected tools in a simple clean interface.",
    ca: "escriu, planifica o captura tasques de les eines connectades en una interfície simple i neta.",
  },
  "hero.cta": {
    en: "join public beta",
    ca: "uneix-te a la beta pública",
  },
  // Footer
  "footer.prefix": { en: "—", ca: "—" },
  "footer.forkText": { en: "fork", ca: "fes un fork" },
  "footer.code": { en: "code", ca: "del codi" },
  "footer.or": { en: "or", ca: "o" },
  "footer.followText": { en: "follow", ca: "segueix" },
  "footer.onx": { en: "on x", ca: "a X" },
  // Language names
  "lang.en": { en: "English", ca: "Anglès" },
  "lang.ca": { en: "Catalan", ca: "Català" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "en" || saved === "ca") {
      setLangState(saved);
      return;
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = useMemo(() => {
    return (key: keyof typeof translations) => translations[key][lang] ?? String(key);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
