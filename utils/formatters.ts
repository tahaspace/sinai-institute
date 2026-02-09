// ==========================================
// EduSaas - Formatting Utilities
// ==========================================

import { format, formatDistance, formatRelative, isValid, parseISO } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { CURRENCY, DATE_FORMAT, TIME_FORMAT, DATETIME_FORMAT } from "@/config/constants"

// ==========================================
// Date Formatting
// ==========================================

export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = DATE_FORMAT,
  locale: "ar" | "en" = "ar"
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  
  if (!isValid(dateObj)) return "-"
  
  return format(dateObj, formatStr, {
    locale: locale === "ar" ? ar : enUS,
  })
}

export function formatTime(
  date: Date | string | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  return formatDate(date, TIME_FORMAT, locale)
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  return formatDate(date, DATETIME_FORMAT, locale)
}

export function formatRelativeDate(
  date: Date | string | null | undefined,
  baseDate: Date = new Date(),
  locale: "ar" | "en" = "ar"
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  
  if (!isValid(dateObj)) return "-"
  
  return formatRelative(dateObj, baseDate, {
    locale: locale === "ar" ? ar : enUS,
  })
}

export function formatTimeAgo(
  date: Date | string | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  
  if (!isValid(dateObj)) return "-"
  
  return formatDistance(dateObj, new Date(), {
    addSuffix: true,
    locale: locale === "ar" ? ar : enUS,
  })
}

// Hijri date formatting (basic - you might want to use a library like hijri-date)
export function formatHijriDate(date: Date): string {
  // This is a placeholder - implement actual Hijri conversion
  // Consider using libraries like hijri-date or moment-hijri
  const options: Intl.DateTimeFormatOptions = {
    calendar: "islamic-umalqura",
    day: "numeric",
    month: "long",
    year: "numeric",
  }
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", options).format(date)
}

// ==========================================
// Currency Formatting
// ==========================================

export function formatCurrency(
  amount: number | null | undefined,
  showSymbol: boolean = true,
  locale: "ar" | "en" = "ar"
): string {
  if (amount === null || amount === undefined) return "-"
  
  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: showSymbol ? "currency" : "decimal",
    currency: CURRENCY.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(amount)
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${CURRENCY.symbol}`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${CURRENCY.symbol}`
  }
  return formatCurrency(amount)
}

// ==========================================
// Number Formatting
// ==========================================

export function formatNumber(
  num: number | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (num === null || num === undefined) return "-"
  
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(num)
}

export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined) return "-"
  
  return `${value.toFixed(decimals)}%`
}

export function formatCompactNumber(num: number, locale: "ar" | "en" = "ar"): string {
  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    notation: "compact",
    compactDisplay: "short",
  })
  return formatter.format(num)
}

export function formatOrdinal(num: number, locale: "ar" | "en" = "ar"): string {
  if (locale === "ar") {
    const arabicOrdinals = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", 
      "السادس", "السابع", "الثامن", "التاسع", "العاشر"]
    if (num >= 1 && num <= 10) return arabicOrdinals[num - 1]
    return `الـ ${num}`
  }
  
  const suffixes = ["th", "st", "nd", "rd"]
  const v = num % 100
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

// ==========================================
// Phone Formatting
// ==========================================

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-"
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")
  
  // Egyptian phone format
  if (cleaned.length === 11 && cleaned.startsWith("01")) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`
  }
  
  // With country code
  if (cleaned.length === 12 && cleaned.startsWith("201")) {
    return `+20 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`
  }
  
  return phone
}

// ==========================================
// National ID Formatting
// ==========================================

export function formatNationalId(nationalId: string | null | undefined): string {
  if (!nationalId) return "-"
  
  // Egyptian National ID is 14 digits
  const cleaned = nationalId.replace(/\D/g, "")
  
  if (cleaned.length !== 14) return nationalId
  
  // Format: X XXXXXX XX XXXX X
  return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 13)} ${cleaned.slice(13)}`
}

export function parseNationalId(nationalId: string): {
  century: number
  birthDate: Date | null
  governorate: string
  gender: "male" | "female"
} | null {
  const cleaned = nationalId.replace(/\D/g, "")
  
  if (cleaned.length !== 14) return null
  
  const centuryCode = parseInt(cleaned[0])
  const year = parseInt(cleaned.slice(1, 3))
  const month = parseInt(cleaned.slice(3, 5))
  const day = parseInt(cleaned.slice(5, 7))
  const govCode = cleaned.slice(7, 9)
  const sequenceNumber = parseInt(cleaned.slice(12, 13))
  
  // Century calculation
  let fullYear: number
  if (centuryCode === 2) {
    fullYear = 1900 + year
  } else if (centuryCode === 3) {
    fullYear = 2000 + year
  } else {
    return null
  }
  
  // Governorate mapping (simplified)
  const governorates: { [key: string]: string } = {
    "01": "القاهرة",
    "02": "الإسكندرية",
    "03": "بورسعيد",
    "04": "السويس",
    "11": "دمياط",
    "12": "الدقهلية",
    "13": "الشرقية",
    "14": "القليوبية",
    "15": "كفر الشيخ",
    "16": "الغربية",
    "17": "المنوفية",
    "18": "البحيرة",
    "19": "الإسماعيلية",
    "21": "الجيزة",
    "22": "بني سويف",
    "23": "الفيوم",
    "24": "المنيا",
    "25": "أسيوط",
    "26": "سوهاج",
    "27": "قنا",
    "28": "أسوان",
    "29": "الأقصر",
    "31": "البحر الأحمر",
    "32": "الوادي الجديد",
    "33": "مطروح",
    "34": "شمال سيناء",
    "35": "جنوب سيناء",
  }
  
  return {
    century: centuryCode === 2 ? 20 : 21,
    birthDate: new Date(fullYear, month - 1, day),
    governorate: governorates[govCode] || "غير معروف",
    gender: sequenceNumber % 2 === 1 ? "male" : "female",
  }
}

// ==========================================
// File Size Formatting
// ==========================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// ==========================================
// Name Formatting
// ==========================================

export function formatFullName(
  firstName?: string | null,
  lastName?: string | null,
  middleName?: string | null
): string {
  return [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "-"
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ==========================================
// Grade Formatting (Egyptian System)
// ==========================================

export function formatGrade(score: number): {
  label: string
  labelAr: string
  color: string
} {
  if (score >= 85) {
    return { label: "Excellent", labelAr: "ممتاز", color: "text-green-600" }
  }
  if (score >= 75) {
    return { label: "Very Good", labelAr: "جيد جداً", color: "text-blue-600" }
  }
  if (score >= 65) {
    return { label: "Good", labelAr: "جيد", color: "text-cyan-600" }
  }
  if (score >= 50) {
    return { label: "Pass", labelAr: "مقبول", color: "text-yellow-600" }
  }
  return { label: "Fail", labelAr: "ضعيف", color: "text-red-600" }
}

// ==========================================
// Pluralization (Arabic)
// ==========================================

export function pluralize(count: number, singular: string, dual: string, plural: string): string {
  if (count === 1) return singular
  if (count === 2) return dual
  return plural
}

export function pluralizeStudents(count: number): string {
  return pluralize(count, "طالب", "طالبان", "طلاب")
}

export function pluralizeTeachers(count: number): string {
  return pluralize(count, "معلم", "معلمان", "معلمون")
}

