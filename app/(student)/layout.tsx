"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  User,
  Calendar,
  GraduationCap,
  ClipboardCheck,
  FileText,
  BookOpen,
  CreditCard,
  Bell,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Settings,
  MessageSquare,
  Trophy,
  Star,
  Award,
  Gift,
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

// Navigation Items
const navItems = [
  {
    title: "لوحة المتابعة",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "ملفي الشخصي",
    href: "/student/profile",
    icon: User,
  },
  {
    title: "الجدول الدراسي",
    href: "/student/schedule",
    icon: Calendar,
  },
  {
    title: "الدرجات والنتائج",
    href: "/student/grades",
    icon: GraduationCap,
  },
  {
    title: "الحضور والغياب",
    href: "/student/attendance",
    icon: ClipboardCheck,
  },
  {
    title: "الواجبات",
    href: "/student/assignments",
    icon: FileText,
    badge: 3,
  },
  {
    title: "التعلم الإلكتروني",
    href: "/student/elearning",
    icon: BookOpen,
  },
  {
    title: "المصروفات",
    href: "/student/fees",
    icon: CreditCard,
  },
  {
    title: "نظام التحفيز",
    href: "/student/gamification",
    icon: Trophy,
    badge: "جديد",
  },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="font-bold text-sm">بوابة الطالب</span>
                <p className="text-xs text-muted-foreground">EduSaas</p>
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
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    isActive
                      ? "bg-blue-500 text-white"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "destructive"}
                          className="h-5 min-w-[20px] justify-center text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
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
                  placeholder="بحث..."
                  className="pr-10 bg-muted/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
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

              {/* Messages */}
              <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
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
                    {[1, 2, 3].map((i) => (
                      <DropdownMenuItem key={i} className="flex items-start gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">واجب جديد في الرياضيات</p>
                          <p className="text-xs text-muted-foreground">
                            موعد التسليم: غداً
                          </p>
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
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="/avatars/student.jpg" />
                      <AvatarFallback className="bg-blue-500 text-white">
                        أ
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium">أحمد محمد</p>
                      <p className="text-xs text-muted-foreground">الصف الثالث الثانوي</p>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="w-4 h-4 ml-2" />
                    الملف الشخصي
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



