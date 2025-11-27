import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko.json'
import vi from './locales/vi.json'

const resources = {
  ko: { translation: ko },
  vi: { translation: vi },
}

// Update HTML lang attribute when language changes
const updateDocumentLanguage = (lng: string) => {
  document.documentElement.lang = lng
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: {
    escapeValue: false,
  },
})

// Set initial language
updateDocumentLanguage(i18n.language)

// Listen for language changes
i18n.on('languageChanged', updateDocumentLanguage)

export default i18n
