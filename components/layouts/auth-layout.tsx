"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { GraduationCap, Sun, Moon, Globe, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showBackLink?: boolean
  backLinkHref?: string
  backLinkText?: string
  variant?: "login" | "register" | "forgot" | "reset" | "verify"
}

const illustrations = {
  login: {
    title: "مرحباً بعودتك!",
    description: "سجل دخولك للوصول إلى لوحة التحكم الخاصة بك وإدارة مؤسستك التعليمية بكل سهولة.",
    features: ["إدارة الطلاب والمعلمين", "نظام حسابات متكامل", "تقارير وإحصائيات"],
  },
  register: {
    title: "انضم إلينا اليوم!",
    description: "أنشئ حسابك الآن واستمتع بتجربة 14 يوم مجانية بدون الحاجة لبطاقة ائتمان.",
    features: ["تجربة مجانية 14 يوم", "دعم فني على مدار الساعة", "تحديثات مستمرة"],
  },
  forgot: {
    title: "نسيت كلمة المرور؟",
    description: "لا تقلق! سنرسل لك رابطاً لإعادة تعيين كلمة المرور على بريدك الإلكتروني.",
    features: ["استعادة سريعة", "رابط آمن", "صلاحية محدودة"],
  },
  reset: {
    title: "إعادة تعيين كلمة المرور",
    description: "أدخل كلمة المرور الجديدة. تأكد من اختيار كلمة مرور قوية.",
    features: ["كلمة مرور قوية", "تشفير آمن", "حماية متقدمة"],
  },
  verify: {
    title: "تأكيد البريد الإلكتروني",
    description: "تم إرسال رمز التحقق إلى بريدك الإلكتروني. أدخله للتحقق من حسابك.",
    features: ["تحقق سريع", "رمز صالح لـ 10 دقائق", "إعادة إرسال متاحة"],
  },
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackLink = false,
  backLinkHref = "/",
  backLinkText = "العودة للرئيسية",
  variant = "login",
}: AuthLayoutProps) {
  const { isDark, toggleTheme, mounted } = useTheme()
  const illustration = illustrations[variant]

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-secondary overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating Shapes */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-20 right-20 w-20 h-20 bg-white/10 rounded-2xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute bottom-40 left-20 w-32 h-32 bg-white/10 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/10 rounded-xl rotate-45"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <span className="text-2xl font-bold">EduSaas</span>
          </Link>

          {/* Illustration Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold mb-4">{illustration.title}</h2>
            <p className="text-lg text-white/80 mb-8 max-w-md">
              {illustration.description}
            </p>

            <ul className="space-y-3">
              {illustration.features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/90">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Bottom Stats */}
          <div className="mt-auto pt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/70">مؤسسة تعليمية</div>
            </div>
            <div>
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-white/70">طالب</div>
            </div>
            <div>
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-white/70">وقت التشغيل</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          {showBackLink ? (
            <Button variant="ghost" asChild>
              <Link href={backLinkHref} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                {backLinkText}
              </Link>
            </Button>
          ) : (
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">EduSaas</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Globe className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {/* Form */}
            {children}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} EduSaas. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  )
}

