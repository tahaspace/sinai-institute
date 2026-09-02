"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL } from "@/components/shared/academic-system-filter"
import { ACADEMIC_SYSTEM_LABELS, type AcademicSystem } from "@/lib/academic-system"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react"

interface AttendanceStatsData {
  trackedStudents: number
  avgAttendance: number
  atRisk: number
}

interface DepartmentAttendance {
  name: string
  attendance: number
}

interface WarningStudent {
  id: string
  studentCode: string
  name: string
  department: string
  attendance: number
  absences: number
}

export default function AttendancePage() {
  // Display-only narrowing. Every number on this screen (the four cards, the per-department bars and
  // the deprivation-warning list) is aggregated server-side from ONE population, so the filter has to
  // travel to the server and the page refetches on change — a browser-side pass would narrow the list
  // while the cards above it kept quoting institute-wide figures.
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  // what the server reported it applied — drives the "no matches" wording below
  const [appliedSystem, setAppliedSystem] = useState<AcademicSystem | null>(null)
  const [stats, setStats] = useState<AttendanceStatsData>({ trackedStudents: 0, avgAttendance: 0, atRisk: 0 })
  const [departmentAttendance, setDepartmentAttendance] = useState<DepartmentAttendance[]>([])
  const [warningStudents, setWarningStudents] = useState<WarningStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // "all" appends no query string at all, so the default request is byte-identical to before
        const qs = systemFilter === ACADEMIC_SYSTEM_ALL ? "" : `?system=${systemFilter}`
        const res = await fetch(`/api/institute/students/attendance${qs}`)
        if (!res.ok) throw new Error("فشل في جلب بيانات الحضور")
        const json = await res.json()
        if (!cancelled) {
          setStats(json.stats ?? { trackedStudents: 0, avgAttendance: 0, atRisk: 0 })
          setDepartmentAttendance(json.departmentAttendance ?? [])
          setWarningStudents(json.warningStudents ?? [])
          setAppliedSystem(json.system ?? null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [systemFilter])

  const attendanceStats = [
    // an average over zero tracked students is not 0% — it does not exist
    { label: "متوسط الحضور", value: stats.trackedStudents === 0 ? "—" : `${stats.avgAttendance}%`, icon: TrendingUp, color: "text-institute-blue" },
    { label: "طلاب متابَعون", value: String(stats.trackedStudents), icon: CheckCircle, color: "text-institute-blue" },
    { label: "طلاب تحت الخطر", value: String(stats.atRisk), icon: AlertTriangle, color: "text-red-600" },
    { label: "تحذير حرمان", value: String(warningStudents.length), icon: Clock, color: "text-yellow-600" },
  ]

  const courseAttendance = departmentAttendance.map((dept) => ({
    name: dept.name,
    rate: dept.attendance,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-institute-blue" />
            الحضور والغياب
          </h1>
          <p className="text-muted-foreground">متابعة حضور الطلاب في المحاضرات</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Course narrowing is not implemented on this screen; a second, inert Select next to a
              working filter would imply both narrow the data, so it is not rendered at all. */}
          <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full sm:w-48" />
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بيانات الحضور...</CardContent></Card>}

      {/* Stats — hidden while a refetch is in flight so the cards never quote the PREVIOUS
          population's totals next to the "جارٍ التحميل" card below the filter. */}
      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {attendanceStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {/* the zeros above are "no one matched this system", not "attendance collapsed" */}
          {appliedSystem && stats.trackedStudents === 0 && (
            <p className="text-sm text-muted-foreground">
              لا يوجد طلاب متابَعون مطابقون في {ACADEMIC_SYSTEM_LABELS[appliedSystem]}
            </p>
          )}
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Course Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              الحضور حسب القسم
            </CardTitle>
            <CardDescription>نسب الحضور لكل قسم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseAttendance.map((course, index) => (
                <motion.div
                  key={course.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-muted-foreground">القسم</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={course.rate} 
                      className={`h-2 flex-1 ${course.rate < 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-institute-blue"}`} 
                    />
                    <span className={`text-sm font-bold ${course.rate < 80 ? "text-red-600" : "text-institute-blue"}`}>
                      {course.rate}%
                    </span>
                  </div>
                </motion.div>
              ))}
              {appliedSystem && courseAttendance.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد أقسام مطابقة في {ACADEMIC_SYSTEM_LABELS[appliedSystem]}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warning Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              تحذير حرمان
            </CardTitle>
            <CardDescription>طلاب قريبون من الحد الأقصى للغياب</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {warningStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-muted-foreground">{student.studentCode}</p>
                    </div>
                    <Badge variant="outline">{student.department}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      غيابات: <span className="font-bold text-red-600">{student.absences}</span>
                    </span>
                    <span className="text-muted-foreground">
                      نسبة الحضور: <span className="font-bold text-yellow-600">{student.attendance}%</span>
                    </span>
                  </div>
                  <Progress value={student.attendance} className="h-2 mt-2 [&>div]:bg-yellow-500" />
                </motion.div>
              ))}
              {appliedSystem && warningStudents.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا يوجد طلاب مطابقون في {ACADEMIC_SYSTEM_LABELS[appliedSystem]}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
