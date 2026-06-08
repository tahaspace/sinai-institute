"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollText, Search, RefreshCw } from "lucide-react"

interface AuditRow {
  id: string
  createdAt: string
  actorUserId: string | null
  action: string
  targetType: string | null
  targetId: string | null
  universityId: string | null
}

const LIMIT_OPTIONS = ["50", "100", "200", "500"]

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Applied filters (drive the fetch). The action input is debounced via a manual refresh + Enter.
  const [actionFilter, setActionFilter] = useState("")
  const [limit, setLimit] = useState("100")
  // Bumping this forces a re-fetch (used by the refresh button and Enter key).
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams()
        if (actionFilter.trim()) qs.set("action", actionFilter.trim())
        qs.set("limit", limit)
        const res = await fetch(`/api/admin/platform/audit-log?${qs.toString()}`)
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل في جلب سجل التدقيق")
        const json = await res.json()
        if (!cancelled) setRows(json.rows ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [limit, reloadTick])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-institute-blue" />
            سجل التدقيق
          </h1>
          <p className="text-muted-foreground">
            سجل الإجراءات الإدارية على المنصة — الأحدث أولاً
          </p>
        </div>
        <Button variant="outline" onClick={() => setReloadTick((t) => t + 1)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="action-filter">تصفية حسب الإجراء</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="action-filter"
                  placeholder="ابحث في اسم الإجراء..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setReloadTick((t) => t + 1) }}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit-select">عدد السجلات</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger id="limit-select" className="w-full md:w-40">
                  <SelectValue placeholder="العدد" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt} سجل</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setReloadTick((t) => t + 1)} disabled={loading}>
              <Search className="w-4 h-4 ml-2" />
              تطبيق
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>الأحداث</CardTitle>
          <CardDescription>إجمالي {rows.length} سجل</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">جارٍ تحميل سجل التدقيق...</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا توجد سجلات مطابقة</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>المنفّذ</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>الهدف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.actorUserId ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{row.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.targetType || row.targetId ? (
                        <div>
                          {row.targetType && <span className="font-medium">{row.targetType}</span>}
                          {row.targetId && (
                            <span className="text-muted-foreground font-mono"> #{row.targetId}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
