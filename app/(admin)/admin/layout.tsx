"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  ToggleRight,
  ScrollText,
  LogOut,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { title: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "الجامعات والكليات", href: "/admin/universities", icon: Building2 },
  { title: "المستخدمون", href: "/admin/users", icon: Users },
  { title: "الأدوار والصلاحيات", href: "/admin/roles", icon: ShieldCheck },
  { title: "مفاتيح الميزات", href: "/admin/feature-flags", icon: ToggleRight },
  { title: "سجل التدقيق", href: "/admin/audit-log", icon: ScrollText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-l bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">لوحة المنصة</p>
            <p className="text-[11px] text-muted-foreground">إدارة عليا</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t dark:border-slate-800">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
