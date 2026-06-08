"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Wallet,
  Library,
  GraduationCap,
  ClipboardCheck,
  LogOut,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  title: string
  subtitle: string
  href: string
  icon: typeof Wallet
  // user needs ANY one of these permission keys to see the link
  anyOf: string[]
}

const PORTALS: NavItem[] = [
  {
    title: "المحاسبة",
    subtitle: "الرسوم والتحصيل",
    href: "/accountant/dashboard",
    icon: Wallet,
    anyOf: ["finance.view", "accounting.view"],
  },
  {
    title: "المكتبة",
    subtitle: "إدارة المكتبة",
    href: "/library-admin/dashboard",
    icon: Library,
    anyOf: ["library.view"],
  },
  {
    title: "شؤون الطلاب",
    subtitle: "الطلاب والإرشاد",
    href: "/student-affairs/dashboard",
    icon: GraduationCap,
    anyOf: ["student.view", "advising.view"],
  },
  {
    title: "القبول",
    subtitle: "طلبات الالتحاق",
    href: "/admission-admin/dashboard",
    icon: ClipboardCheck,
    anyOf: ["admission.application.view"],
  },
]

function canAccess(permissions: string[], anyOf: string[]) {
  // platform admin holds the wildcard and sees every portal
  if (permissions.includes("*")) return true
  return anyOf.some((p) => permissions.includes(p))
}

export default function AdminPortalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const permissions = session?.user?.permissions ?? []

  const links = PORTALS.filter((item) => canAccess(permissions, item.anyOf))

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-l bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">بوابات الإدارة</p>
            <p className="text-[11px] text-muted-foreground">الخدمات المساندة</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              لا توجد بوابات متاحة لحسابك
            </p>
          ) : (
            links.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-teal-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span>{item.title}</span>
                    <span
                      className={cn(
                        "text-[11px]",
                        active ? "text-teal-100" : "text-muted-foreground"
                      )}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                </Link>
              )
            })
          )}
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
