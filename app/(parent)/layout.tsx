"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
  Bell,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Settings,
  Heart,
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
  { title: "لوحة المتابعة", href: "/parent/dashboard", icon: LayoutDashboard },
  { title: "متابعة الأبناء", href: "/parent/children", icon: Users, badge: 2 },
  { title: "المصروفات", href: "/parent/fees", icon: CreditCard },
  { title: "التواصل", href: "/parent/messages", icon: MessageSquare },
  { title: "التقارير", href: "/parent/reports", icon: FileText },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-muted/30">
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

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full bg-card border-l transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/parent/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="font-bold text-sm">بوابة ولي الأمر</span>
                <p className="text-xs text-muted-foreground">EduSaas</p>
              </motion.div>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

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
                    isActive ? "bg-pink-500 text-white" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm">{item.title}</span>
                      {item.badge && <Badge variant={isActive ? "secondary" : "outline"}>{item.badge}</Badge>}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>

      <div className={cn("transition-all duration-300", sidebarOpen ? "lg:mr-64" : "lg:mr-20")}>
        <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur border-b">
          <div className="flex items-center justify-between h-full px-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." className="pr-10 bg-muted/50" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-pink-500 text-white">م</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium">محمد علي أحمد</p>
                      <p className="text-xs text-muted-foreground">ولي أمر</p>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><Settings className="w-4 h-4 ml-2" />الإعدادات</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600"><LogOut className="w-4 h-4 ml-2" />تسجيل الخروج</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}



