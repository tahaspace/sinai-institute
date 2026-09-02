"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesAnySystem } from "@/components/shared/academic-system-filter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, Search, Calendar, Clock, BookOpen, CheckCircle, AlertTriangle } from "lucide-react"

interface CatalogCourse {
  id: string
  offeringId: string
  sectionId: string
  code: string
  name: string
  hours: number
  instructor: string
  seats: number
  enrolled: number
  schedule: string
  /** systems of the study plans carrying this course; empty = on no plan yet, so never filtered out */
  systems: string[]
}

interface RegistrationPeriod {
  startDate: string
  endDate: string
  status: string
  daysLeft: number
}

interface RegistrationTerm {
  academicYear: string
  semester: string
}

interface ApiStats {
  registeredStudents: number
  offeredCourses: number
  averageHours: number
}

const SEMESTER_AR: Record<string, string> = {
  first: "الأول",
  second: "الثاني",
  summer: "الصيفي",
}

export default function RegistrationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)

  const [registrationPeriod, setRegistrationPeriod] = useState<RegistrationPeriod | null>(null)
  const [term, setTerm] = useState<RegistrationTerm | null>(null)
  const [availableCourses, setAvailableCourses] = useState<CatalogCourse[]>([])
  const [apiStats, setApiStats] = useState<ApiStats>({ registeredStudents: 0, offeredCourses: 0, averageHours: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/registration`)
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setRegistrationPeriod(json.period ?? null)
          setTerm(json.term ?? null)
          setAvailableCourses(json.catalog ?? [])
          setApiStats(json.stats ?? { registeredStudents: 0, offeredCourses: 0, averageHours: 0 })
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

  const isOpen = registrationPeriod?.status === "open"

  const filteredCourses = availableCourses.filter(
    (c) =>
      (!searchQuery || c.name.includes(searchQuery) || c.code.includes(searchQuery)) &&
      // matchesAnySystem, not matchesSystem: one course can sit on both a credit-hour and an annual plan
      matchesAnySystem(c.systems, systemFilter)
  )

  const stats = [
    { label: "طلاب مسجلين", value: apiStats.registeredStudents.toLocaleString("en-US"), icon: GraduationCap, color: "text-institute-blue" },
    { label: "مقررات مطروحة", value: apiStats.offeredCourses.toLocaleString("en-US"), icon: BookOpen, color: "text-institute-blue" },
    // Arithmetic unchanged (registered credit-hours ÷ every registered student); the label says so, since
    // annual students carry no credit hours and would otherwise look like part of an "hours" average.
    { label: "متوسط الساعات المعتمدة (لكل طالب مسجل)", value: apiStats.averageHours.toLocaleString("en-US"), icon: Clock, color: "text-institute-gold" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-institute-blue" />
            تسجيل المقررات
          </h1>
          <p className="text-muted-foreground">
            {term ? `الفصل الدراسي ${SEMESTER_AR[term.semester] ?? term.semester} ${term.academicYear}` : "الفصل الدراسي"}
          </p>
        </div>
        <Badge className={`text-lg px-4 py-2 ${
          isOpen ? "bg-institute-blue text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {isOpen ? "التسجيل مفتوح" : "التسجيل مغلق"}
        </Badge>
      </div>

      {loading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {/* Registration Period */}
      {registrationPeriod && (
        <Card className="bg-gradient-to-br from-institute-blue to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">فترة التسجيل</h3>
                <p className="text-white/80">
                  من {registrationPeriod.startDate} إلى {registrationPeriod.endDate}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{registrationPeriod.daysLeft}</p>
                  <p className="text-white/80 text-sm">يوم متبقي</p>
                </div>
                <Calendar className="w-12 h-12 text-white/50" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => (
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

      {/* Available Courses */}
      <Card>
        <CardHeader>
          <CardTitle>المقررات المتاحة للتسجيل</CardTitle>
          <CardDescription>اختر المقررات التي تريد تسجيلها</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Both controls live inside the card that owns the catalog: they narrow THIS list only, never
              the term-wide stat tiles above («طلاب مسجلين» counts students, not catalog rows). */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن مقرر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-48" />
          </div>
          <div className="space-y-4">
            {!loading && filteredCourses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {systemFilter !== ACADEMIC_SYSTEM_ALL ? "لا توجد مقررات مطابقة للنظام المحدد" : "لا توجد مقررات متاحة"}
              </p>
            )}
            {filteredCourses.map((course, index) => {
              const seatPercentage = course.seats > 0 ? (course.enrolled / course.seats) * 100 : 0
              const isAlmostFull = seatPercentage >= 90
              // Course.creditHours is a credit-hour column; a row carried only by annual study plans has
              // no credit hours to show. Unknown/mixed rows keep the badge (narrow, never hide).
              const annualOnly = course.systems.length > 0 && !course.systems.includes("CREDIT_HOURS")

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox id={course.id} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{course.name}</h4>
                      <Badge variant="outline">{course.code}</Badge>
                      {!annualOnly && <Badge className="bg-institute-blue text-institute-blue">{course.hours} ساعات</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{course.instructor}</span>
                      <span>•</span>
                      <span>{course.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={seatPercentage} className="h-2 flex-1 max-w-48" />
                      <span className={`text-sm ${isAlmostFull ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {course.enrolled}/{course.seats}
                      </span>
                      {isAlmostFull && <AlertTriangle className="w-4 h-4 text-red-600" />}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    تسجيل
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
