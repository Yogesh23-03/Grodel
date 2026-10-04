import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '../i18n/index'
import { supportedLanguages } from '../i18n/locales.js'

const LanguageContext = createContext(null)

function clearGoogleTranslateCookie() {
  const host = window.location.hostname;
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;
  if (host.includes('.')) {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${host};`;
  }
}

function cleanupGoogleTranslateDom() {
  document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
  document.body.classList.remove('translated-ltr', 'translated-rtl');
  document.body.style.top = '';
}

function applyGoogleTranslate(code) {
  const host = window.location.hostname;
  document.documentElement.lang = code || 'en';
  const select = document.querySelector('.goog-te-combo');
  
  if (code === 'en') {
    const cookieVal = '/en/en';
    document.cookie = `googtrans=${cookieVal}; path=/; max-age=60;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; max-age=60;`;
    if (host.includes('.')) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=.${host}; max-age=60;`;
    }

    if (select) {
      select.value = 'en';
      if (select.value !== 'en') {
        select.selectedIndex = 0;
      }
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    window.setTimeout(() => {
      clearGoogleTranslateCookie();
      cleanupGoogleTranslateDom();
    }, 250);
    return;
  } else {
    const cookieVal = `/en/${code}`;
    document.cookie = `googtrans=${cookieVal}; path=/; max-age=31536000;`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; max-age=31536000;`;
    if (host.includes('.')) {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=.${host}; max-age=31536000;`;
    }
  }

  if (select) {
    select.value = code;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (!select && code !== 'en') {
    window.location.reload();
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('grodel_lang') || 'en'
  })
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationResetKey, setTranslationResetKey] = useState(0)

  const setLanguage = async (code) => {
    if (!code) return
    try {
      setIsTranslating(true)
      setLanguageState(code)
      localStorage.setItem('grodel_lang', code)
      await i18n.changeLanguage(code)
      applyGoogleTranslate(code)
      if (code === 'en') {
        window.setTimeout(() => {
          setTranslationResetKey((key) => key + 1)
        }, 320)
      }
    } catch (err) {
      console.error('Failed to change language:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  useEffect(() => {
    const savedLang = localStorage.getItem('grodel_lang') || 'en'
    if (i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang)
    }
    document.documentElement.lang = savedLang
    if (savedLang !== 'en') {
      const host = window.location.hostname;
      const cookieVal = `/en/${savedLang}`;
      document.cookie = `googtrans=${cookieVal}; path=/; max-age=31536000;`;
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; max-age=31536000;`;
      if (host.includes('.')) {
        document.cookie = `googtrans=${cookieVal}; path=/; domain=.${host}; max-age=31536000;`;
      }
    } else if (document.cookie.includes('googtrans=')) {
      clearGoogleTranslateCookie()
    }
  }, [])


  const currentLanguageObj = useMemo(() => {
    return supportedLanguages.find(l => l.code === language) || supportedLanguages[0]
  }, [language])

  const value = useMemo(() => ({
    language,
    currentLanguageObj,
    supportedLanguages,
    setLanguage,
    isTranslating,
    translationResetKey
  }), [language, currentLanguageObj, isTranslating, translationResetKey])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}
