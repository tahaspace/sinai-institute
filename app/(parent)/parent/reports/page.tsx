"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Download,
  GraduationCap,
  Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- API response shapes (served by /api/parent/reports) ---
interface Child {
  id: string
  name: string
  studentCode: string
}

interface ReportGrade {
  subject: string
  total: number
  max: number
  letter: string | null
}

interface Report {
  id: string
  name: string
  studentCode: string
  gpa: number
  attendance: number
  activeWarnings: number
  grades: ReportGrade[]
}

interface Certificate {
  id: string
  title: string
  year: string
}

export default function ParentReportsPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/parent/reports`)
        if (!res.ok) throw new Error("فشل في جلب التقارير")
        const json = await res.json()
        if (!cancelled) {
          setChildren(json.children ?? [])
          setReports(json.reports ?? [])
          setCertificates(json.certificates ?? [])
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">التقارير والشهادات</h1>
        <p className="text-muted-foreground">تحميل تقارير وشهادات الأبناء</p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل التقارير...</CardContent></Card>}

      {!loading && !error && children.length === 0 && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">لا يوجد أبناء مرتبطون بهذا الحساب</CardContent></Card>
      )}

      {/* Children Tabs */}
      {!loading && !error && children.length > 0 && (
        <Tabs defaultValue={children[0].id}>
          <TabsList className="w-full justify-start">
            {children.map((child) => (
              <TabsTrigger key={child.id} value={child.id} className="gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-pink-100 text-pink-600">
                    {child.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {child.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {children.map((child) => {
            const report = reports.find((r) => r.id === child.id)
            return (
              <TabsContent key={child.id} value={child.id} className="mt-6">
                {/* Summary stats for the selected child */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <GraduationCap className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold text-blue-600">
                        {report ? report.gpa.toFixed(2) : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">المعدل التراكمي</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
                      <p className="text-2xl font-bold text-green-600">
                        {report ? `${report.attendance}%` : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">الحضور</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Award className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                      <p className="text-2xl font-bold text-orange-600">
                        {report ? report.activeWarnings : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">الإنذارات النشطة</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Reports — driven by the child's grade list */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        التقارير
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report && report.grades.length > 0 ? (
                          report.grades.map((grade, idx) => (
                            <div
                              key={`${child.id}-${idx}`}
                              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{grade.subject}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {grade.total} / {grade.max}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">{grade.letter ?? "—"}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            لا توجد تقارير متاحة
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Certificates — API returns an empty list */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        الشهادات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {certificates.length > 0 ? (
                          certificates.map((cert) => (
                            <div
                              key={cert.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                  <GraduationCap className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{cert.title}</p>
                                  <p className="text-sm text-muted-foreground">{cert.year}</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 ml-2" />
                                تحميل
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            لا توجد شهادات متاحة
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
