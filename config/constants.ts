// ==========================================
// EduSaas - Constants & Configuration
// ==========================================

// App Info
export const APP_NAME = 'EduSaas'
export const APP_NAME_AR = 'إيدو ساس'
export const APP_DESCRIPTION = 'منصة SaaS متكاملة لإدارة المؤسسات التعليمية'
export const APP_VERSION = '1.0.0'

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
export const API_TIMEOUT = 30000

// Egyptian Governorates
export const EGYPTIAN_GOVERNORATES = [
  { value: 'cairo', label: 'Cairo', labelAr: 'القاهرة' },
  { value: 'giza', label: 'Giza', labelAr: 'الجيزة' },
  { value: 'alexandria', label: 'Alexandria', labelAr: 'الإسكندرية' },
  { value: 'dakahlia', label: 'Dakahlia', labelAr: 'الدقهلية' },
  { value: 'sharqia', label: 'Sharqia', labelAr: 'الشرقية' },
  { value: 'gharbia', label: 'Gharbia', labelAr: 'الغربية' },
  { value: 'monufia', label: 'Monufia', labelAr: 'المنوفية' },
  { value: 'beheira', label: 'Beheira', labelAr: 'البحيرة' },
  { value: 'kafr_el_sheikh', label: 'Kafr El Sheikh', labelAr: 'كفر الشيخ' },
  { value: 'qalyubia', label: 'Qalyubia', labelAr: 'القليوبية' },
  { value: 'damietta', label: 'Damietta', labelAr: 'دمياط' },
  { value: 'port_said', label: 'Port Said', labelAr: 'بورسعيد' },
  { value: 'ismailia', label: 'Ismailia', labelAr: 'الإسماعيلية' },
  { value: 'suez', label: 'Suez', labelAr: 'السويس' },
  { value: 'north_sinai', label: 'North Sinai', labelAr: 'شمال سيناء' },
  { value: 'south_sinai', label: 'South Sinai', labelAr: 'جنوب سيناء' },
  { value: 'red_sea', label: 'Red Sea', labelAr: 'البحر الأحمر' },
  { value: 'matrouh', label: 'Matrouh', labelAr: 'مطروح' },
  { value: 'new_valley', label: 'New Valley', labelAr: 'الوادي الجديد' },
  { value: 'fayoum', label: 'Fayoum', labelAr: 'الفيوم' },
  { value: 'beni_suef', label: 'Beni Suef', labelAr: 'بني سويف' },
  { value: 'minya', label: 'Minya', labelAr: 'المنيا' },
  { value: 'asyut', label: 'Asyut', labelAr: 'أسيوط' },
  { value: 'sohag', label: 'Sohag', labelAr: 'سوهاج' },
  { value: 'qena', label: 'Qena', labelAr: 'قنا' },
  { value: 'luxor', label: 'Luxor', labelAr: 'الأقصر' },
  { value: 'aswan', label: 'Aswan', labelAr: 'أسوان' },
]

// School Types
export const SCHOOL_TYPES = [
  { value: 'governmental', label: 'Governmental', labelAr: 'حكومية' },
  { value: 'private_arabic', label: 'Private Arabic', labelAr: 'خاصة عربي' },
  { value: 'private_language', label: 'Private Languages', labelAr: 'خاصة لغات' },
  { value: 'international', label: 'International', labelAr: 'إنترناشيونال' },
  { value: 'community', label: 'Community', labelAr: 'مجتمعية' },
]

// University Types
export const UNIVERSITY_TYPES = [
  { value: 'governmental', label: 'Governmental', labelAr: 'حكومية' },
  { value: 'private', label: 'Private', labelAr: 'خاصة' },
  { value: 'international', label: 'International', labelAr: 'دولية' },
  { value: 'national', label: 'National', labelAr: 'أهلية' },
]

// Institute Types
export const INSTITUTE_TYPES = [
  { value: 'higher', label: 'Higher Institute', labelAr: 'معهد عالي' },
  { value: 'technical', label: 'Technical', labelAr: 'فني' },
  { value: 'vocational', label: 'Vocational Training', labelAr: 'تدريب مهني' },
]

// Subscription Plans
export const SUBSCRIPTION_PLANS = [
  { 
    value: 'basic', 
    label: 'Basic', 
    labelAr: 'أساسي',
    price: 500,
    maxStudents: 100,
    maxTeachers: 10,
    modules: ['students', 'teachers', 'grades']
  },
  { 
    value: 'standard', 
    label: 'Standard', 
    labelAr: 'قياسي',
    price: 1000,
    maxStudents: 500,
    maxTeachers: 50,
    modules: ['students', 'teachers', 'grades', 'finance', 'library']
  },
  { 
    value: 'premium', 
    label: 'Premium', 
    labelAr: 'متميز',
    price: 2000,
    maxStudents: 2000,
    maxTeachers: 200,
    modules: ['all']
  },
  { 
    value: 'enterprise', 
    label: 'Enterprise', 
    labelAr: 'مؤسسي',
    price: 'custom',
    maxStudents: 'unlimited',
    maxTeachers: 'unlimited',
    modules: ['all', 'api', 'dedicated_support']
  },
]

// Egyptian Grading System
export const EGYPTIAN_GRADES = {
  EXCELLENT: { min: 85, max: 100, label: 'Excellent', labelAr: 'ممتاز' },
  VERY_GOOD: { min: 75, max: 84, label: 'Very Good', labelAr: 'جيد جداً' },
  GOOD: { min: 65, max: 74, label: 'Good', labelAr: 'جيد' },
  PASS: { min: 50, max: 64, label: 'Pass', labelAr: 'مقبول' },
  FAIL: { min: 0, max: 49, label: 'Fail', labelAr: 'ضعيف' },
}

// Maximum failed subjects allowed for progression (Egyptian system)
export const MAX_FAILED_SUBJECTS_FOR_PROGRESSION = 2

// GPA Conversion (Egyptian to 4.0 scale)
export const GPA_CONVERSION = {
  EXCELLENT: 4.0,
  VERY_GOOD: 3.5,
  GOOD: 2.5,
  PASS: 2.0,
  FAIL: 0,
}

// Academic Terms
export const ACADEMIC_TERMS = [
  { value: 'first', label: 'First Term', labelAr: 'الفصل الدراسي الأول' },
  { value: 'second', label: 'Second Term', labelAr: 'الفصل الدراسي الثاني' },
  { value: 'summer', label: 'Summer', labelAr: 'الصيفي' },
]

// Days of Week (Arabic)
export const DAYS_OF_WEEK = [
  { value: 'saturday', label: 'Saturday', labelAr: 'السبت' },
  { value: 'sunday', label: 'Sunday', labelAr: 'الأحد' },
  { value: 'monday', label: 'Monday', labelAr: 'الإثنين' },
  { value: 'tuesday', label: 'Tuesday', labelAr: 'الثلاثاء' },
  { value: 'wednesday', label: 'Wednesday', labelAr: 'الأربعاء' },
  { value: 'thursday', label: 'Thursday', labelAr: 'الخميس' },
  { value: 'friday', label: 'Friday', labelAr: 'الجمعة' },
]

// Pagination
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// Currency
export const CURRENCY = {
  code: 'EGP',
  symbol: 'ج.م',
  locale: 'ar-EG',
}

// Phone Format (Egypt)
export const PHONE_REGEX = /^(\+20|0)?1[0125][0-9]{8}$/
export const NATIONAL_ID_REGEX = /^[23][0-9]{13}$/

// Date Formats
export const DATE_FORMAT = 'dd/MM/yyyy'
export const DATE_FORMAT_AR = 'yyyy/MM/dd'
export const TIME_FORMAT = 'hh:mm a'
export const DATETIME_FORMAT = 'dd/MM/yyyy hh:mm a'

// Animation Durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
}

// Breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// Z-Index Layers
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
}

// Routes
export const ROUTES = {
  // Public
  HOME: '/',
  FEATURES: '/features',
  PRICING: '/pricing',
  ABOUT: '/about',
  CONTACT: '/contact',
  
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  
  // Platform Owner
  PLATFORM_DASHBOARD: '/platform',
  PLATFORM_SUBSCRIBERS: '/platform/subscribers',
  PLATFORM_PLANS: '/platform/plans',
  PLATFORM_FINANCE: '/platform/finance',
  PLATFORM_SETTINGS: '/platform/settings',
  
  // School
  SCHOOL_DASHBOARD: '/school',
  SCHOOL_STUDENTS: '/school/students',
  SCHOOL_TEACHERS: '/school/teachers',
  SCHOOL_CLASSES: '/school/classes',
  SCHOOL_GRADES: '/school/grades',
  SCHOOL_FINANCE: '/school/finance',
  
  // University
  UNIVERSITY_DASHBOARD: '/university',
  UNIVERSITY_FACULTIES: '/university/faculties',
  UNIVERSITY_STUDENTS: '/university/students',
  UNIVERSITY_PROFESSORS: '/university/professors',
  UNIVERSITY_RESEARCH: '/university/research',
  
  // Institute
  INSTITUTE_DASHBOARD: '/institute',
  INSTITUTE_PROGRAMS: '/institute/programs',
  INSTITUTE_TRAINEES: '/institute/trainees',
  INSTITUTE_TRAINERS: '/institute/trainers',
  
  // User Portals
  STUDENT_PORTAL: '/student',
  TEACHER_PORTAL: '/teacher',
  PARENT_PORTAL: '/parent',
}

