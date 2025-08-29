"use client";

import React from "react";
import { useLanguage } from "./LanguageContext";

export default function LanguageSelect() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={lang === "ca"}
        aria-label="Toggle Catalan language"
        onClick={() => setLang(lang === "ca" ? "en" : "ca")}
        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 ${
          lang === "ca" ? "bg-gray-800" : "bg-gray-300"
        }`}
     >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            lang === "ca" ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">Català</span>
    </div>
  );
}
