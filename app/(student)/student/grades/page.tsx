"use client"

import { useState, useEffect } from "react"
import {
  GraduationCap,
  Download,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
  Lock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// --- API response shapes (served by /api/student/grades) ---
interface SubjectGrade {
  courseId: string
  subject: string
  midterm: number
  final: number
  practical: number
  homework: number
  total: number
  max: number
  midtermMax: number
  finalMax: number
  practicalMax: number
  homeworkMax: number
  letterGrade: string | null
  gradeStatusCode: string | null
  statusName: string | null
  affectsGpa: boolean
  isPass: boolean
  percentage: number
  trend: "up" | "down" | "same"
}
interface ExamResult {
  id: string
  exam: string
  subjects: number
  average: number
}
interface GradesStats {
  gpa: number
  rank: number
  totalStudents: number
  totalGrade: number
  maxGrade: number
  percentage: number
}
interface GradesResponse {
  student: { id: string; studentCode: string; name: string; level: number }
  stats: GradesStats | null
  subjects: SubjectGrade[]
  exams: ExamResult[]
  // ClientR5 — result-visibility hold: when true the marks are withheld and only the message shows.
  held?: boolean
  holdType?: string | null
  holdMessage?: string | null
}
interface StandingData {
  cgpa: number
  earnedHours: number
  onProbation: boolean
  hourCap: number | null
  escalation: "none" | "warning" | "track-change-or-dismissal"
  termHonor: boolean
  cumulativeHonor: boolean
  canPromote: boolean
  qualifiedLevel: number
  graduationEligible: boolean
  remainingHours: number
  flags: string[]
}

const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return "text-green-600"
  if (percentage >= 75) return "text-blue-600"
  if (percentage >= 60) return "text-yellow-600"
  return "text-red-600"
}

const getGradeLabel = (percentage: number) => {
  if (percentage >= 90) return "ممتاز"
  if (percentage >= 80) return "جيد جداً"
  if (percentage >= 70) return "جيد"
  if (percentage >= 60) return "مقبول"
  return "ضعيف"
}

export default function StudentGradesPage() {
  const [semester, setSemester] = useState("first")
  const [data, setData] = useState<GradesResponse | null>(null)
  const [standing, setStanding] = useState<StandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cumulative academic standing (probation/honor/promotion/graduation) — term-independent.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/student/standing`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.standing) setStanding(j.standing) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/grades?semester=${semester}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || "فشل في جلب الدرجات")
        }
        const json = (await res.json()) as GradesResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [semester])

  const subjectGrades = data?.subjects ?? []
  const examResults = data?.exams ?? []
  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الدرجات والنتائج</h1>
          <p className="text-muted-foreground">
            عرض درجاتك ونتائج الاختبارات
            {data?.student ? ` — ${data.student.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">الفصل الأول</SelectItem>
              <SelectItem value="second">الفصل الثاني</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تحميل التقرير
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* ClientR5 — result held: show the hold message instead of the marks (result is NOT deleted). */}
      {data?.held && (
        <Card className="border-r-4 border-r-amber-500 bg-amber-50/60">
          <CardContent className="p-6 flex items-start gap-3">
            <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800 mb-1">النتيجة غير متاحة حاليًا</h3>
              <p className="text-sm text-amber-900/90">
                {data.holdMessage ?? "يوجد قيد على حسابك يمنع عرض النتيجة. يرجى مراجعة شؤون الطلاب."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {standing && standing.flags.length > 0 && (
        <Card className={cn(
          "border-r-4",
          standing.escalation === "track-change-or-dismissal" ? "border-r-red-500 bg-red-50/50" :
          standing.escalation === "warning" || standing.onProbation ? "border-r-amber-500 bg-amber-50/50" :
          standing.cumulativeHonor || standing.termHonor ? "border-r-institute-gold bg-yellow-50/40" :
          "border-r-green-500 bg-green-50/40"
        )}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">الحالة الأكاديمية:</span>
              {standing.flags.map((f, i) => (
                <Badge
                  key={i}
                  className={cn(
                    f.includes("نهائي") ? "bg-red-100 text-red-700" :
                    f.includes("إنذار") || f.includes("الملاحظة") ? "bg-amber-100 text-amber-700" :
                    f.includes("الشرف") ? "bg-yellow-100 text-yellow-800" :
                    f.includes("التخرج") ? "bg-teal-100 text-teal-700" :
                    "bg-green-100 text-green-700"
                  )}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل الدرجات...
          </CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-blue-600">{stats.gpa.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">المعدل التراكمي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{stats.rank}</p>
                <p className="text-sm text-muted-foreground">الترتيب من {stats.totalStudents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalGrade}/{stats.maxGrade}
                </p>
                <p className="text-sm text-muted-foreground">المجموع الكلي</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-teal-500 mb-2" />
                <p className="text-2xl font-bold text-teal-600">
                  {stats.percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">النسبة المئوية</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="subjects">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="subjects">درجات المواد</TabsTrigger>
              <TabsTrigger value="exams">نتائج الاختبارات</TabsTrigger>
              <TabsTrigger value="certificates">الشهادات</TabsTrigger>
            </TabsList>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>درجات المواد الدراسية</CardTitle>
                  <CardDescription>تفاصيل الدرجات لكل مادة</CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectGrades.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      لا توجد درجات مسجلة لهذا الفصل بعد
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3 text-right font-medium">المادة</th>
                            <th className="p-3 text-center font-medium">نصف العام</th>
                            <th className="p-3 text-center font-medium">نهاية العام</th>
                            <th className="p-3 text-center font-medium">عملي</th>
                            <th className="p-3 text-center font-medium">أعمال سنة</th>
                            <th className="p-3 text-center font-medium">المجموع</th>
                            <th className="p-3 text-center font-medium">الحالة</th>
                            <th className="p-3 text-center font-medium">التقدير</th>
                            <th className="p-3 text-center font-medium">الاتجاه</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectGrades.map((grade) => {
                            const percentage = grade.percentage

                            return (
                              <tr key={grade.courseId} className="border-b">
                                <td className="p-3 font-medium">{grade.subject}</td>
                                <td className="p-3 text-center">
                                  {grade.midterm}/{grade.midtermMax}
                                </td>
                                <td className="p-3 text-center">
                                  {grade.final}/{grade.finalMax}
                                </td>
                                <td className="p-3 text-center">
                                  {grade.practicalMax > 0 ? `${grade.practical}/${grade.practicalMax}` : "-"}
                                </td>
                                <td className="p-3 text-center">
                                  {grade.homework}/{grade.homeworkMax}
                                </td>
                                <td className="p-3 text-center font-bold">
                                  <span className={getGradeColor(percentage)}>
                                    {grade.total}/{grade.max}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {grade.gradeStatusCode ? (
                                    <Badge
                                      className={cn(
                                        grade.isPass
                                          ? "bg-green-100 text-green-700"
                                          : grade.affectsGpa
                                            ? "bg-red-100 text-red-700"
                                            : "bg-gray-100 text-gray-600"
                                      )}
                                      title={grade.statusName ?? undefined}
                                    >
                                      {grade.gradeStatusCode}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge className={cn(
                                    percentage >= 90 ? "bg-green-100 text-green-700" :
                                    percentage >= 75 ? "bg-blue-100 text-blue-700" :
                                    percentage >= 60 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  )}>
                                    {getGradeLabel(percentage)}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  {grade.trend === "up" && (
                                    <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />
                                  )}
                                  {grade.trend === "down" && (
                                    <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />
                                  )}
                                  {grade.trend === "same" && (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exams Tab */}
            <TabsContent value="exams" className="mt-6">
              <div className="space-y-4">
                {examResults.map((exam) => (
                  <Card key={exam.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold">{exam.exam}</h3>
                          <p className="text-sm text-muted-foreground">
                            {exam.subjects} مواد
                          </p>
                        </div>
                        <div className="text-center">
                          <p className={cn(
                            "text-3xl font-bold",
                            getGradeColor(exam.average)
                          )}>
                            {exam.average}%
                          </p>
                          <Badge className={cn(
                            exam.average >= 90 ? "bg-green-100 text-green-700" :
                            exam.average >= 75 ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          )}>
                            {getGradeLabel(exam.average)}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={exam.average} className="h-3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Certificates Tab */}
            <TabsContent value="certificates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>الشهادات</CardTitle>
                  <CardDescription>تحميل الشهادات والنتائج</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">شهادات متاحة للتحميل</h3>
                    <p className="text-muted-foreground mb-4">
                      يمكنك تحميل شهادات نتائج الفصل الدراسي
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <Button variant="outline">
                        <Download className="w-4 h-4 ml-2" />
                        شهادة نصف العام
                      </Button>
                      <Button>
                        <Download className="w-4 h-4 ml-2" />
                        شهادة نهاية العام
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
