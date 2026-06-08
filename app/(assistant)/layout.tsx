"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  MessageSquare,
  Menu,
  X,
  LogOut,
  GraduationCap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// TA (معيد) navigation — a teaching assistant works inside the faculty
// surfaces for grading, office hours and student messages. The dashboard is
// the only TA-owned route; the rest deep-link into the faculty area.
const navItems = [
  {
    title: "لوحة المعيد",
    href: "/assistant/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "الدرجات",
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
  },
]

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-gray-900 dark:to-gray-800">
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
        <div className="h-16 flex items-center justify-between px-4 border-b bg-gradient-to-l from-amber-500 to-orange-500">
          <Link href="/assistant/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="font-bold text-sm text-white">بوابة المعيد</span>
                <p className="text-xs text-white/70">TA Portal</p>
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
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    isActive
                      ? "bg-gradient-to-l from-amber-500 to-orange-500 text-white shadow-md"
                      : "hover:bg-amber-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                  )}
                </Link>
              )
            })}

            {/* Sign Out */}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="flex-1 text-sm font-medium text-right">
                  تسجيل الخروج
                </span>
              )}
            </button>
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

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-base text-gray-800 dark:text-gray-100">
                بوابة المعيد
              </span>
            </div>

            {/* Sign Out (header) */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
