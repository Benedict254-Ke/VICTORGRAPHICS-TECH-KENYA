import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import language files
import enTranslations from './locales/en.json'
import swTranslations from './locales/sw.json'

const resources = {
  en: {
    translation: enTranslations
  },
  sw: {
    translation: swTranslations
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en', // Fallback language if translation is missing
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense for i18n
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n