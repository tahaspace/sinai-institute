"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileBarChart, Printer } from "lucide-react"

interface CourseLite { id: string; code: string; nameAr: string }

const REPORTS = [
  { key: "course-results", label: "نتائج المقررات (نسبة النجاح / الراسبون / المنسحبون)" },
  { key: "grade-sheet", label: "كشف رصد الدرجات (لكل مقرر)" },
  { key: "pass-fail", label: "كشف نجاح ورسوب (بالأسماء — لكل مقرر)" },
  { key: "success-stats", label: "إحصائيات النجاح (المعهد / المستوى / القسم)" },
  { key: "fail-reasons", label: "أسباب الرسوب (تحريري / حضور / غش …)" },
  { key: "absence-reasons", label: "أسباب الغياب (مرض / حادث / قهري …)" },
  { key: "open-actions", label: "الإجراءات المفتوحة (تكميلي / استكمال تقييم)" },
  { key: "warned", label: "الطلاب تحت الإنذار" },
  { key: "expected-graduates", label: "الخريجون المتوقعون" },
  { key: "student-status", label: "بيان حالة طالب" },
  { key: "ministry-prep", label: "كشف إعداد امتحانات الوزارة" },
  { key: "ministry-transitional", label: "كشف الوزارة — الفرق الانتقالية" },
  { key: "ministry-final", label: "كشف الوزارة — فرقة التخرج" },
  { key: "ministry-deprived", label: "كشف الوزارة — المحرومون / الغائبون" },
  { key: "transcript", label: "السجل الأكاديمي للطالب (كشف درجات)" },
]
const SEM: Record<string, string> = { first: "الأول", second: "الثاني", summer: "الصيفي" }
const ACTION_LABEL: Record<string, string> = { MAKEUP_EXAM: "امتحان تكميلي", COMPLETE_ASSESSMENT: "استكمال تقييم", REPEAT: "إعادة المقرر", NONE: "—" }
const OUTCOME: Record<string, { label: string; cls: string }> = {
  pass: { label: "ناجح", cls: "bg-green-100 text-green-700" },
  fail: { label: "راسب", cls: "bg-red-100 text-red-700" },
  withdrawn: { label: "منسحب", cls: "bg-gray-100 text-gray-600" },
  incomplete: { label: "غير مكتمل", cls: "bg-amber-100 text-amber-700" },
  ungraded: { label: "غير مرصود", cls: "bg-gray-50 text-gray-400" },
}

export default function ReportsPage() {
  const [type, setType] = useState("course-results")
  const [courses, setCourses] = useState<CourseLite[]>([])
  const [courseId, setCourseId] = useState("")
  const [studentCode, setStudentCode] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsCourse = type === "grade-sheet" || type === "ministry-prep" || type === "pass-fail"
  const needsStudent = type === "transcript" || type === "student-status"

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ type })
      if (needsCourse && courseId) qs.set("courseId", courseId)
      if (needsStudent && studentCode) qs.set("studentCode", studentCode)
      const res = await fetch(`/api/institute/reports?${qs.toString()}`)
      if (!res.ok) throw new Error("فشل في إنشاء التقرير")
      const json = await res.json()
      setCourses(json.courses ?? [])
      setReport(json.report ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [type, courseId, studentCode, needsCourse, needsStudent])

  // initial: load courses + the default report
  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-institute-blue" />
            تقارير شؤون الطلاب والامتحانات
          </h1>
          <p className="text-muted-foreground">كشوف الرصد والنتائج والإنذارات والخريجين المتوقعين</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 ml-2" />طباعة</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <Select value={type} onValueChange={(v) => { setType(v); setReport(null) }}>
            <SelectTrigger className="md:w-96"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {needsCourse && (
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="md:w-64"><SelectValue placeholder="اختر المقرر" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {needsStudent && (
            <Input placeholder="الرقم الجامعي (مثال 2024-105)" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className="md:w-64" />
          )}
          <Button onClick={run} disabled={loading || (needsCourse && !courseId) || (needsStudent && !studentCode)}>
            {loading ? "جارٍ..." : "عرض التقرير"}
          </Button>
        </CardContent>
      </Card>

      {error && <Card><CardContent className="p-4 text-center text-red-600">{error}</CardContent></Card>}
      {report?.error && <Card><CardContent className="p-4 text-center text-amber-600">{report.error}</CardContent></Card>}

      {/* course-results */}
      {type === "course-results" && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج المقررات</CardTitle>
            <CardDescription>
              {report.totals.courses} مقرر · نسبة نجاح عامة {report.totals.passRate}% · ناجحون {report.totals.pass} · راسبون {report.totals.fail} · منسحبون {report.totals.withdrawn}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>المقرر</TableHead><TableHead className="text-center">مسجل</TableHead>
                <TableHead className="text-center">ناجح</TableHead><TableHead className="text-center">راسب</TableHead>
                <TableHead className="text-center">منسحب</TableHead><TableHead className="text-center">نسبة النجاح</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.code}>
                    <TableCell className="font-mono">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-center">{r.enrolled}</TableCell>
                    <TableCell className="text-center text-green-700">{r.pass}</TableCell>
                    <TableCell className="text-center text-red-700">{r.fail}</TableCell>
                    <TableCell className="text-center text-gray-600">{r.withdrawn}</TableCell>
                    <TableCell className="text-center"><Badge className={r.passRate >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.passRate}%</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* grade-sheet */}
      {type === "grade-sheet" && report?.rows && report?.course && (
        <Card>
          <CardHeader>
            <CardTitle>كشف رصد الدرجات — {report.course.code} {report.course.name}</CardTitle>
            <CardDescription>المجموع من {report.course.max}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead>
                <TableHead className="text-center">أعمال الفصل</TableHead><TableHead className="text-center">النهائي</TableHead>
                <TableHead className="text-center">عملي</TableHead><TableHead className="text-center">أعمال السنة</TableHead>
                <TableHead className="text-center">المجموع</TableHead><TableHead className="text-center">النتيجة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-center">{r.midterm ?? "-"}</TableCell>
                    <TableCell className="text-center">{r.final ?? "-"}</TableCell>
                    <TableCell className="text-center">{r.practical ?? "-"}</TableCell>
                    <TableCell className="text-center">{r.homework ?? "-"}</TableCell>
                    <TableCell className="text-center font-bold">{r.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={OUTCOME[r.outcome]?.cls}>{r.statusCode ?? OUTCOME[r.outcome]?.label}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* warned / expected-graduates */}
      {(type === "warned" || type === "expected-graduates") && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>{type === "warned" ? "الطلاب تحت الإنذار" : "الخريجون المتوقعون"}</CardTitle>
            <CardDescription>{report.count} طالب</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead>القسم</TableHead>
                <TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">المعدل</TableHead>
                <TableHead className="text-center">ساعات منجزة</TableHead><TableHead>الحالة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell className="text-center">{r.cgpa.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{r.earnedHours}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{r.flags.map((f: string, i: number) => <Badge key={i} variant="outline">{f}</Badge>)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ministry-prep */}
      {type === "ministry-prep" && report?.rows && report?.course && (
        <Card>
          <CardHeader>
            <CardTitle>كشف إعداد امتحانات الوزارة — {report.course.code} {report.course.name}</CardTitle>
            <CardDescription>{report.count} مرشح</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">المستوى</TableHead>
                <TableHead className="text-center">المعدل</TableHead><TableHead className="text-center">ساعات</TableHead><TableHead className="text-center">مؤهل للتخرج</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell className="text-center">{r.cgpa.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{r.earnedHours}</TableCell>
                    <TableCell className="text-center">{r.graduationEligible ? "نعم" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* transcript */}
      {type === "transcript" && report?.student && (
        <Card>
          <CardHeader>
            <CardTitle>السجل الأكاديمي — {report.student.name}</CardTitle>
            <CardDescription>
              {report.student.studentCode} · المستوى {report.student.level}
              {report.standing ? ` · المعدل التراكمي ${report.standing.cgpa.toFixed(2)} · ساعات منجزة ${report.standing.earnedHours}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.terms.length === 0 && <p className="text-muted-foreground">لا يوجد سجل</p>}
            {report.terms.map((t: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={i}>
                <p className="font-medium mb-1">الفصل {SEM[t.semester] ?? t.semester} — {t.academicYear}</p>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>الكود</TableHead><TableHead>المقرر</TableHead><TableHead className="text-center">ساعات</TableHead>
                    <TableHead className="text-center">التقدير</TableHead><TableHead className="text-center">النقاط</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {t.courses.map((c: any, j: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <TableRow key={j}>
                        <TableCell className="font-mono">{c.code}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="text-center">{c.creditHours}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary" title={c.statusName ?? undefined}>{c.statusCode ?? "-"}</Badge></TableCell>
                        <TableCell className="text-center">{c.points ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* pass-fail — named roster per course */}
      {type === "pass-fail" && report?.rows && report?.course && (
        <Card>
          <CardHeader>
            <CardTitle>كشف نجاح ورسوب — {report.course.code} {report.course.name}</CardTitle>
            <CardDescription>
              {report.enrolled} طالب · نسبة النجاح {report.passRate}% · ناجحون {report.counts.pass} · راسبون {report.counts.fail} · منسحبون {report.counts.withdrawn} · غير مكتمل {report.counts.incomplete}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead className="text-center">المستوى</TableHead>
                <TableHead className="text-center">التقدير</TableHead><TableHead className="text-center">النقاط</TableHead><TableHead className="text-center">النتيجة</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" title={r.statusName ?? undefined}>{r.statusCode ?? "-"}</Badge></TableCell>
                    <TableCell className="text-center">{r.points ?? "-"}</TableCell>
                    <TableCell className="text-center"><Badge className={OUTCOME[r.outcome]?.cls}>{OUTCOME[r.outcome]?.label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* success-stats — institute / level / department pass rates */}
      {type === "success-stats" && report?.overall && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات النجاح — المعهد</CardTitle>
              <CardDescription>
                {report.overall.enrolled} تسجيل · نسبة نجاح عامة {report.overall.passRate}% · ناجحون {report.overall.pass} · راسبون {report.overall.fail} · منسحبون {report.overall.withdrawn} · غير مكتمل {report.overall.incomplete}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader><CardTitle>حسب المستوى</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">تسجيل</TableHead>
                  <TableHead className="text-center">ناجح</TableHead><TableHead className="text-center">راسب</TableHead>
                  <TableHead className="text-center">منسحب</TableHead><TableHead className="text-center">نسبة النجاح</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {report.byLevel.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <TableRow key={r.key}>
                      <TableCell className="text-center font-bold">{r.key}</TableCell>
                      <TableCell className="text-center">{r.enrolled}</TableCell>
                      <TableCell className="text-center text-green-700">{r.pass}</TableCell>
                      <TableCell className="text-center text-red-700">{r.fail}</TableCell>
                      <TableCell className="text-center text-gray-600">{r.withdrawn}</TableCell>
                      <TableCell className="text-center"><Badge className={r.passRate >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.passRate}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>حسب القسم</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>القسم</TableHead><TableHead className="text-center">تسجيل</TableHead>
                  <TableHead className="text-center">ناجح</TableHead><TableHead className="text-center">راسب</TableHead>
                  <TableHead className="text-center">منسحب</TableHead><TableHead className="text-center">نسبة النجاح</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {report.byDepartment.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <TableRow key={r.key}>
                      <TableCell>{r.key}</TableCell>
                      <TableCell className="text-center">{r.enrolled}</TableCell>
                      <TableCell className="text-center text-green-700">{r.pass}</TableCell>
                      <TableCell className="text-center text-red-700">{r.fail}</TableCell>
                      <TableCell className="text-center text-gray-600">{r.withdrawn}</TableCell>
                      <TableCell className="text-center"><Badge className={r.passRate >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.passRate}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* student-status — single-student status statement */}
      {type === "student-status" && report?.student && (
        <Card>
          <CardHeader>
            <CardTitle>بيان حالة طالب — {report.student.name}</CardTitle>
            <CardDescription>
              {report.student.studentCode} · المستوى {report.student.level} · {report.student.department}
              {report.student.program ? ` · ${report.student.program}` : ""} · الحالة {report.student.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.standing && (
              <Table>
                <TableBody>
                  <TableRow><TableCell className="font-medium w-1/3">المعدل التراكمي</TableCell><TableCell>{report.standing.cgpa.toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">الساعات المنجزة / المطلوبة</TableCell><TableCell>{report.standing.earnedHours} / {report.standing.requiredHours}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">المتبقي للتخرج</TableCell><TableCell>{report.standing.remainingHours} ساعة</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">حالة التسجيل (آخر فصل)</TableCell><TableCell>{report.registration ? `${SEM[report.registration.semester] ?? report.registration.semester} ${report.registration.academicYear} — ${report.registration.status}` : "لا يوجد طلب تسجيل"}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">مؤهل للتخرج</TableCell><TableCell>{report.standing.graduationEligible ? "نعم" : "لا"}</TableCell></TableRow>
                </TableBody>
              </Table>
            )}
            {report.standing?.flags?.length > 0 && (
              <div>
                <p className="font-medium mb-1">المؤشرات الأكاديمية</p>
                <div className="flex flex-wrap gap-1">{report.standing.flags.map((f: string, i: number) => <Badge key={i} variant="outline">{f}</Badge>)}</div>
              </div>
            )}
            <div>
              <p className="font-medium mb-1">الإنذارات النشطة ({report.warnings.length})</p>
              {report.warnings.length === 0 ? (
                <p className="text-muted-foreground">لا توجد إنذارات نشطة</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>السبب</TableHead><TableHead className="text-center">المعدل</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {report.warnings.map((w: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <TableRow key={i}>
                        <TableCell><Badge variant="destructive">{w.type}</Badge></TableCell>
                        <TableCell>{w.reason}</TableCell>
                        <TableCell className="text-center">{w.gpa != null ? w.gpa.toFixed(2) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ministry-transitional / ministry-final — level-driven exam-board sheets */}
      {(type === "ministry-transitional" || type === "ministry-final") && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>كشف الوزارة — {type === "ministry-final" ? "فرقة التخرج" : "الفرق الانتقالية"}</CardTitle>
            <CardDescription>{report.count} طالب</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead>القسم</TableHead>
                <TableHead className="text-center">المستوى</TableHead><TableHead className="text-center">المعدل</TableHead>
                <TableHead className="text-center">ساعات</TableHead><TableHead className="text-center">مؤهل للتخرج</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell className="text-center">{r.cgpa.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{r.earnedHours}</TableCell>
                    <TableCell className="text-center">{r.graduationEligible ? "نعم" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ministry-deprived — المحرومون / الغائبون */}
      {type === "ministry-deprived" && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>كشف الوزارة — المحرومون / الغائبون</CardTitle>
            <CardDescription>{report.count} طالب (حالات DN / NE / E / ABS / AB)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead>القسم</TableHead>
                <TableHead className="text-center">المستوى</TableHead><TableHead>المقررات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <TableRow key={r.studentCode}>
                    <TableCell className="font-mono">{r.studentCode}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell className="text-center">{r.level}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.courses.map((c: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                          <Badge key={i} variant="outline" title={c.name}>{c.code} ({c.statusCode})</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* fail-reasons / absence-reasons — reason breakdown (count per reason) */}
      {(type === "fail-reasons" || type === "absence-reasons") && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>{type === "fail-reasons" ? "أسباب الرسوب" : "أسباب الغياب"}</CardTitle>
            <CardDescription>الإجمالي {report.total}</CardDescription>
          </CardHeader>
          <CardContent>
            {report.rows.length === 0 ? (
              <p className="text-center text-muted-foreground p-6">لا توجد بيانات للفترة المحددة</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>السبب</TableHead><TableHead className="text-center">الفئة</TableHead><TableHead className="text-center">العدد</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {report.rows.map((r: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <TableRow key={r.code}>
                      <TableCell className="font-medium">{r.nameAr}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{r.category}</Badge></TableCell>
                      <TableCell className="text-center font-bold">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* open-actions — held results awaiting a follow-up */}
      {type === "open-actions" && report?.rows && (
        <Card>
          <CardHeader>
            <CardTitle>الإجراءات المفتوحة</CardTitle>
            <CardDescription>
              {report.total} إجراء معلّق
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {report.summary?.length ? " · " + report.summary.map((s: any) => `${ACTION_LABEL[s.actionType] ?? s.actionType}: ${s.count}`).join(" · ") : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.rows.length === 0 ? (
              <p className="text-center text-muted-foreground p-6">لا توجد إجراءات مفتوحة</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>الرقم</TableHead><TableHead>الاسم</TableHead><TableHead>القسم</TableHead><TableHead>المقرر</TableHead>
                  <TableHead className="text-center">الحالة</TableHead><TableHead className="text-center">الإجراء</TableHead>
                  <TableHead className="text-center">المهلة</TableHead><TableHead className="text-center">الاعتماد</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {report.rows.map((r: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                    <TableRow key={i}>
                      <TableCell className="font-mono">{r.studentCode}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.courseCode} - {r.course}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="border-amber-500 text-amber-700">{r.statusCode}</Badge></TableCell>
                      <TableCell className="text-center text-sm">{ACTION_LABEL[r.actionType] ?? r.actionType}</TableCell>
                      <TableCell className="text-center text-sm">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("ar-EG") : "-"}</TableCell>
                      <TableCell className="text-center text-sm">{r.approvalState ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
