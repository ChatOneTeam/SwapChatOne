/**
 * i18n Configuration
 * 
 * 国际化配置文件，支持中文、英文、韩文
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zh from './locales/zh.json'
import en from './locales/en.json'
import ko from './locales/ko.json'

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  ko: { translation: ko },
}

i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next) // 初始化 react-i18next
  .init({
    resources,
    fallbackLng: 'en', // 默认语言
    supportedLngs: ['zh', 'en', 'ko'], // 支持的语言
    interpolation: {
      escapeValue: false, // React 已经转义了
    },
    detection: {
      // 语言检测配置
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n

