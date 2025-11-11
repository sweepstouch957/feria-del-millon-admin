"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Importar las traducciones directamente
import esTranslations from "../../public/locales/es/translation.json";
import enTranslations from "../../public/locales/en/translation.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "es",
      supportedLngs: ["en", "es"],
      interpolation: {
        escapeValue: false,
      },
      resources: {
        es: {
          translation: esTranslations,
        },
        en: {
          translation: enTranslations,
        },
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
      },
    });
}

export default i18n;
