import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import am from './locales/am.json';
import om from './locales/om.json';
import { readBootstrapLanguage, setDocumentLanguage, LANGUAGE_STORAGE_KEY } from '../utils/langStorage';

const bootstrapLng = typeof window !== 'undefined' ? readBootstrapLanguage() : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    om: { translation: om },
  },
  lng: bootstrapLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

if (typeof document !== 'undefined') {
  setDocumentLanguage(bootstrapLng);
}

export { LANGUAGE_STORAGE_KEY, setDocumentLanguage };

export default i18n;
