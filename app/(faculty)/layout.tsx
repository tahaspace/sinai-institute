"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FlaskConical,
  Calendar,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  GraduationCap,
  Award,
  Clock,
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

// Navigation Items for Faculty Portal
const navItems = [
  {
    title: "لوحة المتابعة",
    href: "/faculty/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "المقررات الدراسية",
    href: "/faculty/courses",
    icon: BookOpen,
    badge: 4,
  },
  {
    title: "طلابي",
    href: "/faculty/students",
    icon: Users,
    badge: 120,
  },
  {
    title: "البحث العلمي",
    href: "/faculty/research",
    icon: FlaskConical,
    children: [
      { title: "مشاريعي البحثية", href: "/faculty/research" },
      { title: "منشوراتي", href: "/faculty/research/publications" },
      { title: "الإشراف", href: "/faculty/research/supervision" },
    ],
  },
  {
    title: "الجدول الأكاديمي",
    href: "/faculty/schedule",
    icon: Calendar,
  },
  {
    title: "الدرجات والتقييم",
    href: "/faculty/grades",
    icon: ClipboardCheck,
  },
  {
    title: "الساعات المكتبية",
    href: "/faculty/office-hours",
    icon: Clock,
  },
  {
    title: "الرسائل",
    href: "/faculty/messages",
    icon: MessageSquare,
    badge: 5,
  },
  {
    title: "الإعدادات",
    href: "/faculty/settings",
    icon: Settings,
  },
]

export default function FacultyLayout({
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-gray-900 dark:to-gray-800">
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
          "fixed top-0 right-0 z-50 h-full bg-white dark:bg-gray-900 border-l shadow-lg transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b bg-gradient-to-l from-indigo-600 to-purple-600">
          <Link href="/faculty/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="font-bold text-sm text-white">بوابة الأستاذ</span>
                <p className="text-xs text-white/70">Faculty Portal</p>
              </motion.div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white"
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
                        ? "bg-gradient-to-l from-indigo-500 to-purple-500 text-white shadow-md"
                        : "hover:bg-indigo-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
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
                          <span className="flex-1 text-sm font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? "secondary" : "outline"}
                              className="h-5 min-w-[20px] justify-center text-xs"
                            >
                              {item.badge}
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
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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
        <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b">
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
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="بحث في المقررات، الطلاب..."
                  className="pr-10 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Semester Badge */}
              <Badge variant="outline" className="hidden md:flex gap-1 bg-indigo-50 text-indigo-700 border-indigo-200">
                <Calendar className="w-3 h-3" />
                الفصل الأول 2024/2025
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
                      { title: "واجب جديد للتصحيح", desc: "CS101 - 15 واجب", time: "منذ 5 دقائق" },
                      { title: "جلسة إرشاد أكاديمي", desc: "مع الطالب أحمد محمد", time: "بعد ساعة" },
                      { title: "اجتماع القسم", desc: "غداً الساعة 10 صباحاً", time: "منذ ساعة" },
                    ].map((notif, i) => (
                      <DropdownMenuItem key={i} className="flex items-start gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-500">{notif.desc}</p>
                          <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
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
                    <Avatar className="w-8 h-8 ring-2 ring-indigo-500 ring-offset-2">
                      <AvatarImage src="/avatars/faculty.jpg" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                        د
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium">د. محمد أحمد علي</p>
                      <p className="text-xs text-gray-500">أستاذ مساعد - علوم الحاسب</p>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Award className="w-4 h-4 ml-2" />
                    الملف الأكاديمي
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
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
