"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Users,
  GraduationCap,
  FileText,
  Wallet,
  MessageSquare,
  Library,
  Award,
  ShieldCheck,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  School,
  Calendar,
  BookOpen,
  ClipboardList,
  Brain,
  Receipt,
  DollarSign,
  CreditCard,
  Monitor,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

// Navigation Items - المعهد العالي (مؤسسة أكاديمية)
const navItems = [
  {
    title: "لوحة المتابعة",
    href: "/institute/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "الأقسام العلمية",
    href: "/institute/departments",
    icon: Building2,
    badge: 8,
    children: [
      { title: "جميع الأقسام", href: "/institute/departments" },
      { title: "البرامج الأكاديمية", href: "/institute/departments/programs" },
      { title: "المقررات الدراسية", href: "/institute/departments/courses" },
      { title: "الخطط الدراسية", href: "/institute/departments/plans" },
    ],
  },
  {
    title: "القبول والتسجيل",
    href: "/institute/admission",
    icon: UserPlus,
    badge: 320,
    children: [
      { title: "طلبات القبول", href: "/institute/admission" },
      { title: "تسجيل المقررات", href: "/institute/admission/registration" },
      { title: "التحويلات", href: "/institute/admission/transfers" },
      { title: "المعادلات", href: "/institute/admission/equivalence" },
    ],
  },
  {
    title: "شؤون الطلاب",
    href: "/institute/students",
    icon: Users,
    badge: 2500,
    children: [
      { title: "قائمة الطلاب", href: "/institute/students" },
      { title: "الإرشاد الأكاديمي", href: "/institute/students/advising" },
      { title: "الإنذارات الأكاديمية", href: "/institute/students/warnings" },
      { title: "التخرج", href: "/institute/students/graduation" },
      { title: "الحضور والغياب", href: "/institute/students/attendance" },
    ],
  },
  {
    title: "هيئة التدريس",
    href: "/institute/faculty",
    icon: GraduationCap,
    badge: 120,
    children: [
      { title: "أعضاء هيئة التدريس", href: "/institute/faculty" },
      { title: "العبء التدريسي", href: "/institute/faculty/workload" },
      { title: "الجداول", href: "/institute/faculty/schedules" },
      { title: "الساعات المكتبية", href: "/institute/faculty/office-hours" },
    ],
  },
  {
    title: "الامتحانات والتقييم",
    href: "/institute/exams",
    icon: FileText,
    children: [
      { title: "جداول الامتحانات", href: "/institute/exams" },
      { title: "بنك الأسئلة", href: "/institute/exams/question-bank" },
      { title: "إدخال الدرجات", href: "/institute/exams/grades" },
      { title: "الكنترول", href: "/institute/exams/control" },
      { title: "النتائج", href: "/institute/exams/results" },
      { title: "التظلمات", href: "/institute/exams/appeals" },
    ],
  },
  {
    title: "الامتحانات الأونلاين",
    href: "/institute/online-exams",
    icon: Monitor,
    badge: "جديد",
    children: [
      { title: "قائمة الامتحانات", href: "/institute/online-exams" },
      { title: "إنشاء امتحان جديد", href: "/institute/online-exams/create" },
      { title: "بنك الأسئلة الأونلاين", href: "/institute/online-exams/question-bank" },
      { title: "تقارير النتائج", href: "/institute/online-exams/reports" },
    ],
  },
  {
    title: "الحسابات المالية",
    href: "/institute/accounting",
    icon: Wallet,
    children: [
      { title: "لوحة تحكم المدير المالي", href: "/institute/finance/cfo-dashboard" },
      { title: "لوحة المتابعة المالية", href: "/institute/accounting/dashboard" },
      { title: "رسوم البرامج الأكاديمية", href: "/institute/accounting/tuition" },
      { title: "التحصيل", href: "/institute/accounting/collection" },
      { title: "المصروفات الدراسية", href: "/institute/finance" },
      { title: "التحصيل القديم", href: "/institute/finance/collection" },
      { title: "الأقساط", href: "/institute/finance/installments" },
      { title: "المنح والإعفاءات", href: "/institute/finance/scholarships" },
      { title: "التقارير المالية", href: "/institute/finance/reports" },
      { title: "منشئ التقارير", href: "/institute/finance/report-builder" },
    ],
  },
  {
    title: "التواصل",
    href: "/institute/communication",
    icon: MessageSquare,
    badge: 15,
  },
  {
    title: "المكتبة",
    href: "/institute/library",
    icon: Library,
  },
  {
    title: "الأنشطة الطلابية",
    href: "/institute/activities",
    icon: Award,
  },
  {
    title: "ضمان الجودة",
    href: "/institute/quality",
    icon: ShieldCheck,
  },
  {
    title: "الرواتب",
    href: "/institute/payroll",
    icon: Receipt,
    children: [
      { title: "لوحة متابعة الرواتب", href: "/institute/payroll/dashboard" },
    ],
  },
  {
    title: "البنوك",
    href: "/institute/banking",
    icon: CreditCard,
    children: [
      { title: "لوحة متابعة البنوك", href: "/institute/banking/dashboard" },
    ],
  },
  {
    title: "الإعدادات",
    href: "/institute/settings",
    icon: Settings,
    children: [
      { title: "الإعدادات العامة", href: "/institute/settings" },
      { title: "إعدادات الساعات المعتمدة", href: "/institute/settings/credit-hours" },
      { title: "إعدادات الذكاء الاصطناعي", href: "/institute/settings/ai" },
    ],
  },
]

export default function InstituteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    if (expandedItems.includes(href)) {
      setExpandedItems(expandedItems.filter((item) => item !== href))
    } else {
      setExpandedItems([...expandedItems, href])
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full bg-card border-l transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/institute/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-institute-blue to-blue-600 flex items-center justify-center shadow-lg shadow-institute-blue/30">
              <School className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="font-bold text-sm bg-gradient-to-r from-institute-blue to-institute-gold bg-clip-text text-transparent">المعهد العالي</span>
                <p className="text-xs text-muted-foreground">للهندسة والتكنولوجيا</p>
              </motion.div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const isExpanded = expandedItems.includes(item.href)
              const hasChildren = item.children && item.children.length > 0

              return (
                <div key={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-institute-blue to-blue-600 text-white shadow-md shadow-institute-blue/30"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpanded(item.href)
                      }
                    }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 flex-1"
                      onClick={(e) => hasChildren && e.preventDefault()}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-sm">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "outline"}
                              className="h-5 min-w-[20px] justify-center text-xs"
                            >
                              {typeof item.badge === 'number' && item.badge > 999 
                                ? `${(item.badge / 1000).toFixed(1)}k` 
                                : item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                    {sidebarOpen && hasChildren && (
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    )}
                  </div>

                  {/* Sub Items */}
                  {sidebarOpen && hasChildren && isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mr-6 mt-1 space-y-1 border-r pr-4"
                    >
                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block px-3 py-2 rounded-lg text-sm transition-colors",
                            pathname === child.href
                              ? "bg-gradient-to-r from-institute-blue/10 to-institute-gold/10 text-institute-blue dark:bg-institute-blue/20 dark:text-institute-gold font-medium border-r-2 border-institute-blue"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "lg:mr-64" : "lg:mr-20"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur border-b">
          <div className="flex items-center justify-between h-full px-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن طالب، مقرر، عضو هيئة تدريس..."
                  className="pr-10 bg-muted/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Academic Year & Semester */}
              <Badge variant="outline" className="hidden md:flex gap-1">
                <Calendar className="w-3 h-3" />
                الفصل الدراسي الأول 2024/2025
              </Badge>

              {/* Credit Hours Badge */}
              <Badge variant="secondary" className="hidden lg:flex gap-1">
                <ClipboardList className="w-3 h-3" />
                نظام الساعات المعتمدة
              </Badge>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    {[
                      { title: "طلب قبول جديد", desc: "طالب جديد في قسم الهندسة" },
                      { title: "موعد امتحان", desc: "امتحان نهاية الفصل - الرياضيات" },
                      { title: "تسجيل مقررات", desc: "بدء فترة تسجيل المقررات" },
                    ].map((notif, i) => (
                      <DropdownMenuItem key={i} className="flex items-start gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-institute-blue/20 to-institute-gold/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-institute-blue" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.desc}</p>
                          <p className="text-xs text-muted-foreground mt-1">منذ 10 دقائق</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8 ring-2 ring-institute-gold">
                      <AvatarImage src="/avatars/admin.jpg" />
                      <AvatarFallback className="bg-gradient-to-br from-institute-blue to-blue-600 text-white font-bold">
                        د
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium">د. أحمد محمد</p>
                      <p className="text-xs text-muted-foreground">عميد المعهد</p>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BookOpen className="w-4 h-4 ml-2" />
                    سجل النشاط
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
