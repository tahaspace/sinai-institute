"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Bell, 
  Search, 
  Sun, 
  Moon, 
  Globe, 
  User,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: "info" | "success" | "warning" | "error"
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "طالب جديد",
    message: "تم تسجيل طالب جديد في الصف الثالث",
    time: "منذ 5 دقائق",
    read: false,
    type: "info",
  },
  {
    id: "2",
    title: "تم الدفع",
    message: "تم استلام مبلغ 5000 جنيه من ولي أمر أحمد محمد",
    time: "منذ ساعة",
    read: false,
    type: "success",
  },
  {
    id: "3",
    title: "تنبيه",
    message: "اقتراب موعد امتحانات الفصل الأول",
    time: "منذ 3 ساعات",
    read: true,
    type: "warning",
  },
]

interface DashboardHeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function DashboardHeader({ onMenuClick, showMenuButton = false }: DashboardHeaderProps) {
  const { isDark, toggleTheme, mounted } = useTheme()
  const [notifications, setNotifications] = useState(mockNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Search */}
          <div className="hidden md:flex relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              className="pr-9 bg-muted/50"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Mobile Search */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Language Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <Check className="h-4 w-4" />
                العربية
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <span className="w-4" />
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    variant="destructive"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>الإشعارات</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      تحديد الكل كمقروء
                    </Button>
                  )}
                </SheetTitle>
                <SheetDescription>
                  لديك {unreadCount} إشعارات غير مقروءة
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-colors",
                        notification.read
                          ? "bg-background"
                          : "bg-primary/5 border-primary/20"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-2",
                            getNotificationColor(notification.type)
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{notification.title}</h4>
                            <span className="text-xs text-muted-foreground">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback>أم</AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium">أحمد محمد</p>
                  <p className="text-xs text-muted-foreground">مدير المدرسة</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>حسابي</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  الملف الشخصي
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  الإعدادات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

