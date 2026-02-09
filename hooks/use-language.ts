"use client"

import { useState, useEffect, useCallback } from "react"
import type { Language, Direction } from "@/types"

const LANGUAGE_KEY = "edusaas-language"

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("ar")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(LANGUAGE_KEY) as Language | null
    if (stored && (stored === "ar" || stored === "en")) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_KEY, lang)
    
    // Update document direction and lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = lang
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "ar" ? "en" : "ar")
  }, [language, setLanguage])

  const direction: Direction = language === "ar" ? "rtl" : "ltr"
  const isRTL = direction === "rtl"
  const isArabic = language === "ar"
  const isEnglish = language === "en"

  return {
    language,
    setLanguage,
    toggleLanguage,
    direction,
    isRTL,
    isArabic,
    isEnglish,
    mounted,
  }
}

