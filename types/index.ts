// ==========================================
// EduSaas - TypeScript Types
// ==========================================

// User Types
export type UserRole = 
  | 'platform_owner'      // مالك المنصة
  | 'school_admin'        // مدير المدرسة
  | 'university_admin'    // مدير الجامعة
  | 'institute_admin'     // مدير المعهد
  | 'teacher'             // معلم
  | 'student'             // طالب
  | 'parent'              // ولي أمر
  | 'staff'               // موظف
  | 'accountant'          // محاسب
  | 'hr'                  // موارد بشرية
  | 'librarian'           // أمين مكتبة
  | 'doctor'              // طبيب عيادة
  | 'driver'              // سائق

export type InstitutionType = 'school' | 'university' | 'institute'

export type SchoolType = 
  | 'governmental'        // حكومية
  | 'private_arabic'      // خاصة عربي
  | 'private_language'    // خاصة لغات
  | 'international'       // إنترناشيونال
  | 'community'           // مجتمعية

export type UniversityType = 
  | 'governmental'        // حكومية
  | 'private'             // خاصة
  | 'international'       // دولية
  | 'national'            // أهلية

export type InstituteType = 
  | 'higher'              // عالي
  | 'technical'           // فني
  | 'vocational'          // تدريب مهني

export type SubscriptionPlan = 'basic' | 'standard' | 'premium' | 'enterprise'

export type SubscriptionStatus = 'active' | 'suspended' | 'expired' | 'trial'

// Base User Interface
export interface User {
  id: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  arabicName?: string
  role: UserRole
  avatar?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// Institution Interface
export interface Institution {
  id: string
  name: string
  arabicName: string
  type: InstitutionType
  subType: SchoolType | UniversityType | InstituteType
  logo?: string
  address: Address
  contact: Contact
  subscription: Subscription
  settings: InstitutionSettings
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  street: string
  city: string
  governorate: string
  postalCode?: string
  country: string
}

export interface Contact {
  phone: string
  alternatePhone?: string
  email: string
  website?: string
  fax?: string
}

export interface Subscription {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startDate: Date
  endDate: Date
  modules: string[]
  maxStudents?: number
  maxTeachers?: number
}

export interface InstitutionSettings {
  language: 'ar' | 'en' | 'both'
  timezone: string
  currency: string
  academicYearStart: number // 1-12
  gradingSystem: 'percentage' | 'gpa' | 'letter'
}

// Egyptian Specific Types
export interface EgyptianStudent {
  nationalId: string        // الرقم القومي (14 digits)
  birthDate: Date
  gender: 'male' | 'female'
  religion?: 'muslim' | 'christian' | 'other'
  nationality: string
  governorate: string
  educationType: 'arabic' | 'languages' | 'international'
}

// Grading System (Egyptian)
export interface EgyptianGrade {
  score: number            // 0-100
  grade: string            // ممتاز، جيد جداً، جيد، مقبول، ضعيف
  passed: boolean
  canProgressWithFail: boolean  // يمكن النقل بمادتين راسب
}

// Navigation Types
export interface NavItem {
  title: string
  titleAr: string
  href: string
  icon?: React.ComponentType
  badge?: number
  children?: NavItem[]
  roles?: UserRole[]
}

// Table Types
export interface TableColumn<T> {
  id: string
  header: string
  headerAr: string
  accessorKey: keyof T
  sortable?: boolean
  filterable?: boolean
  cell?: (value: T) => React.ReactNode
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Form Types
export interface SelectOption {
  value: string
  label: string
  labelAr?: string
  disabled?: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationState
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

// Language Types
export type Language = 'ar' | 'en'

export type Direction = 'rtl' | 'ltr'

// Date & Time Types
export interface DateRange {
  from: Date
  to: Date
}

export type CalendarType = 'gregorian' | 'hijri'

// Notification Types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
}

// File Types
export interface FileUpload {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

// Chart Types
export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

// Status Types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted'

// Common Props Types
export interface BaseProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

