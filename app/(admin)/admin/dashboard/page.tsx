"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  ShieldCheck,
  GraduationCap,
  ScrollText,
  Activity,
} from "lucide-react"

interface Counts {
  universities: number
  faculties: number
  users: number
  roles: number
}

interface AuditEntry {
  action: string
  targetType: string | null
  actorUserId: string | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  assign: "إسناد",
  revoke: "إلغاء",
}

function describeAction(action: string): string {
  // Actions are stored like "tenant.create" / "user.update"; map the verb to Arabic when known.
  const verb = action.includes(".") ? action.slice(action.lastIndexOf(".") + 1) : action
  return ACTION_LABELS[verb] ?? action
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts>({ universities: 0, faculties: 0, users: 0, roles: 0 })
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/platform/stats`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب الإحصائيات")
        const json = await res.json()
        if (!cancelled) {
          setCounts(json.counts ?? { universities: 0, faculties: 0, users: 0, roles: 0 })
          setRecentAudit(json.recentAudit ?? [])
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const kpis = [
    { label: "الجامعات", value: counts.universities, icon: Building2, color: "text-indigo-600" },
    { label: "الكليات", value: counts.faculties, icon: GraduationCap, color: "text-violet-600" },
    { label: "المستخدمون", value: counts.users, icon: Users, color: "text-blue-600" },
    { label: "الأدوار", value: counts.roles, icon: ShieldCheck, color: "text-emerald-600" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-7 h-7 text-indigo-600" />
          لوحة تحكم المنصة
        </h1>
        <p className="text-muted-foreground">
          نظرة عامة على إحصائيات المنصة وآخر النشاطات الإدارية
        </p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل الإحصائيات...</CardContent></Card>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-600" />
            آخر النشاطات
          </CardTitle>
          <CardDescription>أحدث {recentAudit.length} عملية مسجلة في سجل التدقيق</CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && recentAudit.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">لا توجد نشاطات مسجلة بعد</p>
          ) : (
            <ul className="divide-y">
              {recentAudit.map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-muted flex items-center justify-center">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {describeAction(entry.action)}
                        {entry.targetType ? (
                          <span className="text-muted-foreground"> · {entry.targetType}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.actorUserId ? `بواسطة ${entry.actorUserId}` : "نظام"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="font-mono text-[11px]">{entry.action}</Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(entry.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
