"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { GraduationCap, Users, MessageSquare, Calendar, Clock, TrendingUp, type LucideIcon } from "lucide-react"

interface AdviceStudent {
  id: string
  studentCode: string
  name: string
  department: string
  gpa: number
  level: number
  activeWarnings: number
  system: string
}

interface AdvisingApiStats {
  needAdvice: number
  totalStudents: number
  sessionsScheduled: number
  totalBySystem?: { CREDIT_HOURS: number; ANNUAL: number }
}

export default function AdvisingPage() {
  const [studentsNeedingAdvice, setStudentsNeedingAdvice] = useState<AdviceStudent[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<unknown[]>([])
  const [apiStats, setApiStats] = useState<AdvisingApiStats>({ needAdvice: 0, totalStudents: 0, sessionsScheduled: 0 })
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/students/advising`)
        if (!res.ok) throw new Error("فشل في جلب بيانات الإرشاد")
        const json = await res.json()
        if (!cancelled) {
          setStudentsNeedingAdvice(json.studentsNeedingAdvice ?? [])
          setUpcomingSessions(json.upcomingSessions ?? [])
          setApiStats(json.stats ?? { needAdvice: 0, totalStudents: 0, sessionsScheduled: 0 })
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

  const narrowed = systemFilter === "CREDIT_HOURS" || systemFilter === "ANNUAL"
  const annualOnly = systemFilter === "ANNUAL"
  const visibleStudents = studentsNeedingAdvice.filter((s) => matchesSystem(s.system, systemFilter))

  // "Needs advising" is a CGPA threshold, so the population it can ever be drawn from is the
  // credit-hours one — at every filter value, "all" included. Pin the denominator to that same
  // population, otherwise the two cards read "12 of 350" with the 12 sourced from a subset of the
  // 350. Falls back to totalStudents when the API predates totalBySystem.
  const totalForSystem = narrowed
    ? apiStats.totalBySystem?.[systemFilter as "CREDIT_HOURS" | "ANNUAL"] ?? apiStats.totalStudents
    : apiStats.totalBySystem?.CREDIT_HOURS ?? apiStats.totalStudents

  // «يحتاجون إرشاد» reads straight off the API at "all", exactly as before; a real selection recounts
  // the visible rows, so the headline can never disagree with the list below. The denominator card is
  // deliberately different — it is pinned to the population the numerator is drawn from, and its label
  // says which population that is rather than claiming to be the whole institute.
  const advisingStats: { label: string; value: string; icon: LucideIcon; color: string; valueClass?: string }[] = [
    {
      label: "طلاب يحتاجون إرشاد",
      // Under ANNUAL the list is structurally empty because the criterion does not exist for those
      // students — not because none of them need advising. Print "—" rather than a fabricated 0.
      value: annualOnly ? "—" : String(narrowed ? visibleStudents.length : apiStats.needAdvice),
      icon: TrendingUp,
      color: annualOnly ? "text-muted-foreground" : "text-red-600",
      valueClass: annualOnly ? "text-muted-foreground" : undefined,
    },
    {
      label: annualOnly ? "طلاب النظام السنوي" : "طلاب نظام الساعات المعتمدة",
      value: String(totalForSystem),
      icon: Users,
      color: "text-institute-blue",
    },
    { label: "جلسات مجدولة", value: String(apiStats.sessionsScheduled), icon: Calendar, color: "text-institute-blue" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-institute-blue" />
            الإرشاد الأكاديمي
          </h1>
          <p className="text-muted-foreground">متابعة ودعم الطلاب أكاديمياً</p>
        </div>
        <Button>
          <Calendar className="w-4 h-4 ml-2" />
          جدولة جلسة إرشاد
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل بيانات الإرشاد...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {advisingStats.map((stat, index) => (
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
                  <p className={stat.valueClass ? `text-2xl font-bold ${stat.valueClass}` : "text-2xl font-bold"}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-64" />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Students Needing Advice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              طلاب بحاجة لإرشاد
            </CardTitle>
            <CardDescription>طلاب يحتاجون متابعة أكاديمية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <Avatar>
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{student.name}</h4>
                      <Badge variant="outline">المستوى {student.level}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* the list is credit-hours only, but never print a CGPA for a student who has none */}
                      <span className={`text-sm font-bold ${student.system === "ANNUAL" ? "text-muted-foreground" : student.gpa < 2 ? "text-red-600" : "text-yellow-600"}`}>
                        GPA: {student.system === "ANNUAL" ? "—" : student.gpa}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{student.studentCode}</span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{student.department}</span>
                    </div>
                    {student.activeWarnings > 0 && (
                      <Badge className="mt-1 bg-red-100 text-red-700">إنذارات نشطة: {student.activeWarnings}</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 ml-1" />
                    تواصل
                  </Button>
                </motion.div>
              ))}
              {narrowed && visibleStudents.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {systemFilter === "ANNUAL"
                    ? "قائمة الإرشاد مبنية على المعدل التراكمي، وهو خاص بنظام الساعات المعتمدة. طلاب النظام السنوي يُقيَّمون بالنسبة المئوية والتقدير."
                    : "لا يوجد طلاب مطابقون للتصفية الحالية."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الجلسات القادمة
            </CardTitle>
            <CardDescription>جلسات الإرشاد المجدولة</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">لا توجد جلسات مجدولة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* No session model yet — list intentionally empty until backend provides sessions */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
