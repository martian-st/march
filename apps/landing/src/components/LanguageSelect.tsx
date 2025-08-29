"use client";

import React from "react";
import { useLanguage } from "./LanguageContext";

export default function LanguageSelect() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="fixed right-4 top-4 z-50">
      <label className="sr-only" htmlFor="lang-select">
        Language
      </label>
      <select
        id="lang-select"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        value={lang}
        onChange={(e) => setLang(e.target.value as any)}
        aria-label="Select language"
      >
        <option value="en">{t("lang.en")}</option>
        <option value="ca">{t("lang.ca")}</option>
      </select>
    </div>
  );
}
