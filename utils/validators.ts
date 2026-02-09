// ==========================================
// EduSaas - Validation Utilities
// ==========================================

import { z } from "zod"
import { PHONE_REGEX, NATIONAL_ID_REGEX } from "@/config/constants"

// ==========================================
// Basic Validators
// ==========================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s-]/g, "")
  return PHONE_REGEX.test(cleaned)
}

export function validateNationalId(nationalId: string): boolean {
  const cleaned = nationalId.replace(/\D/g, "")
  
  if (!NATIONAL_ID_REGEX.test(cleaned)) return false
  
  // Additional validation
  const centuryCode = parseInt(cleaned[0])
  if (centuryCode !== 2 && centuryCode !== 3) return false
  
  const month = parseInt(cleaned.slice(3, 5))
  if (month < 1 || month > 12) return false
  
  const day = parseInt(cleaned.slice(5, 7))
  if (day < 1 || day > 31) return false
  
  return true
}

export function validatePassword(password: string): {
  isValid: boolean
  score: number
  errors: string[]
} {
  const errors: string[] = []
  let score = 0
  
  // Minimum length
  if (password.length < 8) {
    errors.push("يجب أن تكون كلمة المرور 8 أحرف على الأقل")
  } else {
    score += 1
  }
  
  // Has uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف كبير واحد على الأقل")
  } else {
    score += 1
  }
  
  // Has lowercase
  if (!/[a-z]/.test(password)) {
    errors.push("يجب أن تحتوي على حرف صغير واحد على الأقل")
  } else {
    score += 1
  }
  
  // Has number
  if (!/\d/.test(password)) {
    errors.push("يجب أن تحتوي على رقم واحد على الأقل")
  } else {
    score += 1
  }
  
  // Has special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("يجب أن تحتوي على رمز خاص واحد على الأقل")
  } else {
    score += 1
  }
  
  return {
    isValid: errors.length === 0,
    score,
    errors,
  }
}

export function getPasswordStrength(score: number): {
  label: string
  labelAr: string
  color: string
} {
  if (score >= 5) {
    return { label: "Very Strong", labelAr: "قوية جداً", color: "text-green-600" }
  }
  if (score >= 4) {
    return { label: "Strong", labelAr: "قوية", color: "text-blue-600" }
  }
  if (score >= 3) {
    return { label: "Medium", labelAr: "متوسطة", color: "text-yellow-600" }
  }
  if (score >= 2) {
    return { label: "Weak", labelAr: "ضعيفة", color: "text-orange-600" }
  }
  return { label: "Very Weak", labelAr: "ضعيفة جداً", color: "text-red-600" }
}

// ==========================================
// Zod Schemas
// ==========================================

// Email Schema
export const emailSchema = z
  .string()
  .min(1, "البريد الإلكتروني مطلوب")
  .email("البريد الإلكتروني غير صحيح")

// Phone Schema (Egyptian)
export const phoneSchema = z
  .string()
  .min(1, "رقم الهاتف مطلوب")
  .refine((val) => validatePhone(val), {
    message: "رقم الهاتف غير صحيح",
  })

// National ID Schema (Egyptian)
export const nationalIdSchema = z
  .string()
  .min(1, "الرقم القومي مطلوب")
  .length(14, "الرقم القومي يجب أن يكون 14 رقماً")
  .refine((val) => validateNationalId(val), {
    message: "الرقم القومي غير صحيح",
  })

// Password Schema
export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
  .regex(/\d/, "يجب أن تحتوي على رقم واحد على الأقل")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "يجب أن تحتوي على رمز خاص واحد على الأقل")

// Name Schema (Arabic)
export const arabicNameSchema = z
  .string()
  .min(2, "الاسم قصير جداً")
  .max(50, "الاسم طويل جداً")
  .regex(/^[\u0600-\u06FF\s]+$/, "الاسم يجب أن يكون بالعربية فقط")

// Name Schema (English)
export const englishNameSchema = z
  .string()
  .min(2, "الاسم قصير جداً")
  .max(50, "الاسم طويل جداً")
  .regex(/^[a-zA-Z\s]+$/, "الاسم يجب أن يكون بالإنجليزية فقط")

// Name Schema (Both)
export const nameSchema = z
  .string()
  .min(2, "الاسم قصير جداً")
  .max(50, "الاسم طويل جداً")

// ==========================================
// Form Schemas
// ==========================================

// Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Registration Schema
export const registerSchema = z
  .object({
    institutionType: z.enum(["school", "university", "institute"], {
      errorMap: () => ({ message: "اختر نوع المؤسسة" }),
    }),
    institutionName: z.string().min(3, "اسم المؤسسة مطلوب"),
    fullName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
    terms: z.boolean().refine((val) => val === true, {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

// Reset Password Schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// Student Schema
export const studentSchema = z.object({
  nationalId: nationalIdSchema,
  firstName: arabicNameSchema,
  lastName: arabicNameSchema,
  birthDate: z.date({ errorMap: () => ({ message: "تاريخ الميلاد مطلوب" }) }),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "اختر النوع" }),
  }),
  grade: z.string().min(1, "اختر الصف"),
  classId: z.string().min(1, "اختر الفصل"),
  guardianName: nameSchema,
  guardianPhone: phoneSchema,
  guardianEmail: emailSchema.optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type StudentFormData = z.infer<typeof studentSchema>

// Teacher Schema
export const teacherSchema = z.object({
  nationalId: nationalIdSchema,
  firstName: arabicNameSchema,
  lastName: arabicNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subjects: z.array(z.string()).min(1, "اختر مادة واحدة على الأقل"),
  qualification: z.string().min(1, "المؤهل مطلوب"),
  experience: z.number().min(0, "سنوات الخبرة غير صحيحة"),
  joinDate: z.date({ errorMap: () => ({ message: "تاريخ التعيين مطلوب" }) }),
  salary: z.number().min(0, "الراتب غير صحيح"),
})

export type TeacherFormData = z.infer<typeof teacherSchema>

// ==========================================
// Utility Functions
// ==========================================

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidDate(date: string): boolean {
  const parsed = Date.parse(date)
  return !isNaN(parsed)
}

export function isValidAge(birthDate: Date, minAge: number = 4, maxAge: number = 100): boolean {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  return age >= minAge && age <= maxAge
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}

