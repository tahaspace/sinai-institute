"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Award, AlertTriangle, GraduationCap, TrendingUp, Search, ShieldAlert } from "lucide-react"

interface StandingRow {
  studentCode: string
  name: string
  department: string
  level: number
  cgpa: number
  earnedHours: number
  onProbation: boolean
  escalation: "none" | "warning" | "track-change-or-dismissal"
  termHonor: boolean
  cumulativeHonor: boolean
  canPromote: boolean
  qualifiedLevel: number
  graduationEligible: boolean
  remainingHours: number
  failedMandatory: number
  flags: string[]
}
interface StandingStats {
  total: number
  warnings: number
  finalWarnings: number
  honor: number
  promotable: number
  expectedGraduates: number
}
type Filter = "all" | "warnings" | "honor" | "promotable" | "graduates"

export default function AcademicStandingPage() {
  const [rows, setRows] = useState<StandingRow[]>([])
  const [stats, setStats] = useState<StandingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/academic-standing`)
        if (!res.ok) throw new Error("فشل في حساب الحالة الأكاديمية")
        const json = await res.json()
        if (!cancelled) {
          setRows(json.rows ?? [])
          setStats(json.stats ?? null)
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

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = !search || r.name.includes(search) || r.studentCode.includes(search)
      const matchesFilter =
        filter === "all" ? true :
        filter === "warnings" ? r.escalation !== "none" :
        filter === "honor" ? (r.cumulativeHonor || r.termHonor) :
        filter === "promotable" ? r.canPromote :
        filter === "graduates" ? r.graduationEligible : true
      return matchesSearch && matchesFilter
    })
  }, [rows, filter, search])

  const statCards = stats ? [
    { label: "إجمالي الطلاب", value: stats.total, icon: GraduationCap, color: "text-institute-blue" },
    { label: "إنذار أكاديمي", value: stats.warnings, icon: AlertTriangle, color: "text-amber-600" },
    { label: "إنذار نهائي", value: stats.finalWarnings, icon: ShieldAlert, color: "text-red-600" },
    { label: "قائمة الشرف", value: stats.honor, icon: Award, color: "text-institute-gold" },
    { label: "مؤهل للترقية", value: stats.promotable, icon: TrendingUp, color: "text-green-600" },
    { label: "متوقع تخرجهم", value: stats.expectedGraduates, icon: GraduationCap, color: "text-teal-600" },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-7 h-7 text-institute-gold" />
          الحالة الأكاديمية للطلاب
        </h1>
        <p className="text-muted-foreground">الإنذارات الأكاديمية وقائمة الشرف والترقية وشروط التخرج — وفق لائحة المعهد</p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <s.icon className={`w-7 h-7 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الرقم الجامعي..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلاب</SelectItem>
                <SelectItem value="warnings">تحت الإنذار</SelectItem>
                <SelectItem value="honor">قائمة الشرف</SelectItem>
                <SelectItem value="promotable">مؤهل للترقية</SelectItem>
                <SelectItem value="graduates">متوقع تخرجهم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب</CardTitle>
          <CardDescription>{filtered.length} طالب</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">جارٍ حساب الحالة الأكاديمية...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">لا يوجد طلاب مطابقون</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الرقم الجامعي</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead className="text-center">المستوى</TableHead>
                  <TableHead className="text-center">المعدل التراكمي</TableHead>
                  <TableHead className="text-center">ساعات منجزة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        r.cgpa >= 3.33 ? "bg-green-100 text-green-700" :
                        r.cgpa >= 2 ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {r.cgpa.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{r.earnedHours}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.flags.length === 0 && <span className="text-muted-foreground text-sm">منتظم</span>}
                        {r.flags.map((f, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className={
                              f.includes("نهائي") ? "border-red-300 text-red-700" :
                              f.includes("إنذار") || f.includes("الملاحظة") ? "border-amber-300 text-amber-700" :
                              f.includes("الشرف") ? "border-institute-gold text-institute-gold" :
                              f.includes("التخرج") ? "border-teal-300 text-teal-700" :
                              "border-green-300 text-green-700"
                            }
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
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
