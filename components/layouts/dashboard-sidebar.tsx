"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  CalendarDays,
  Wallet,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Building2,
  Library,
  Bus,
  Stethoscope,
  Trophy,
  Package,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
  children?: Omit<NavItem, "icon" | "children">[]
}

const schoolNavItems: NavItem[] = [
  { title: "لوحة التحكم", href: "/school", icon: LayoutDashboard },
  { 
    title: "الطلاب", 
    href: "/school/students", 
    icon: Users,
    children: [
      { title: "جميع الطلاب", href: "/school/students" },
      { title: "إضافة طالب", href: "/school/students/new" },
      { title: "التحويلات", href: "/school/students/transfers" },
    ]
  },
  { 
    title: "المعلمين والموظفين", 
    href: "/school/staff", 
    icon: UserCog,
    children: [
      { title: "المعلمين", href: "/school/staff/teachers" },
      { title: "الإداريين", href: "/school/staff/admins" },
      { title: "الحضور", href: "/school/staff/attendance" },
    ]
  },
  { 
    title: "الشئون الأكاديمية", 
    href: "/school/academic", 
    icon: BookOpen,
    children: [
      { title: "المناهج", href: "/school/academic/curriculum" },
      { title: "الجداول", href: "/school/academic/schedules" },
      { title: "الفصول", href: "/school/academic/classes" },
    ]
  },
  { title: "الامتحانات", href: "/school/exams", icon: CalendarDays, badge: 3 },
  { 
    title: "الحسابات", 
    href: "/school/finance", 
    icon: Wallet,
    children: [
      { title: "الرسوم", href: "/school/finance/fees" },
      { title: "المدفوعات", href: "/school/finance/payments" },
      { title: "التقارير", href: "/school/finance/reports" },
    ]
  },
  { title: "المكتبة", href: "/school/library", icon: Library },
  { title: "النقل", href: "/school/transport", icon: Bus },
  { title: "العيادة", href: "/school/clinic", icon: Stethoscope },
  { title: "الأنشطة", href: "/school/activities", icon: Trophy },
  { title: "المخزون", href: "/school/inventory", icon: Package },
  { title: "التواصل", href: "/school/communication", icon: MessageSquare, badge: 5 },
  { title: "الإعدادات", href: "/school/settings", icon: Settings },
]

interface DashboardSidebarProps {
  type?: "school" | "university" | "institute" | "platform"
}

export function DashboardSidebar({ type = "school" }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Get nav items based on type
  const navItems = schoolNavItems // TODO: Add other types

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => pathname === href
  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true
    if (item.children) {
      return item.children.some((child) => isActive(child.href))
    }
    return false
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-screen bg-card border-l sticky top-0 transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">EduSaas</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(isCollapsed && "mx-auto")}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <div key={item.title}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors",
                          isParentActive(item)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.badge && (
                          <Badge 
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                            variant="destructive"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    {item.children ? (
                      <button
                        onClick={() => toggleExpanded(item.title)}
                        className={cn(
                          "flex items-center w-full gap-3 px-3 py-2 rounded-lg transition-colors",
                          isParentActive(item)
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-right">{item.title}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="h-5 min-w-[20px]">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedItems.includes(item.title) && "rotate-180"
                          )}
                        />
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive(item.href)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="h-5 min-w-[20px]">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    )}

                    {/* Children */}
                    <AnimatePresence>
                      {item.children && expandedItems.includes(item.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mr-4 mt-1 space-y-1 border-r pr-4"
                        >
                          {item.children.map((child) => (
                            <Link
                              key={child.title}
                              href={child.href}
                              className={cn(
                                "block px-3 py-2 text-sm rounded-lg transition-colors",
                                isActive(child.href)
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-accent"
                              )}
                            >
                              {child.title}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4 space-y-2">
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 mx-auto">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">المساعدة</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 mx-auto text-destructive">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <HelpCircle className="h-5 w-5" />
                المساعدة
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive">
                <LogOut className="h-5 w-5" />
                تسجيل الخروج
              </Button>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}

