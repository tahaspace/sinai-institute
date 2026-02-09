"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Download, Plus, BookOpen, GraduationCap } from "lucide-react"

export default function PlansPage() {
  const studyPlan = {
    program: "هندسة الحاسبات",
    totalHours: 160,
    years: [
      {
        year: "السنة الأولى",
        semesters: [
          {
            name: "الفصل الأول",
            courses: [
              { code: "MATH101", name: "رياضيات (1)", hours: 3 },
              { code: "PHYS101", name: "فيزياء", hours: 3 },
              { code: "CS101", name: "مقدمة في البرمجة", hours: 3 },
              { code: "ENG101", name: "لغة إنجليزية", hours: 2 },
              { code: "ARAB101", name: "لغة عربية", hours: 2 },
            ],
          },
          {
            name: "الفصل الثاني",
            courses: [
              { code: "MATH102", name: "رياضيات (2)", hours: 3 },
              { code: "PHYS102", name: "فيزياء (2)", hours: 3 },
              { code: "CS102", name: "برمجة متقدمة", hours: 3 },
              { code: "ENG102", name: "لغة إنجليزية (2)", hours: 2 },
              { code: "ELEC101", name: "دوائر كهربية", hours: 3 },
            ],
          },
        ],
      },
      {
        year: "السنة الثانية",
        semesters: [
          {
            name: "الفصل الأول",
            courses: [
              { code: "CS201", name: "هياكل البيانات", hours: 3 },
              { code: "CS202", name: "معمارية الحاسب", hours: 3 },
              { code: "MATH201", name: "رياضيات متقطعة", hours: 3 },
              { code: "ELEC201", name: "إلكترونيات", hours: 3 },
            ],
          },
          {
            name: "الفصل الثاني",
            courses: [
              { code: "CS203", name: "خوارزميات", hours: 3 },
              { code: "CS204", name: "نظم تشغيل", hours: 3 },
              { code: "CS205", name: "قواعد بيانات", hours: 3 },
              { code: "ELEC202", name: "نظم رقمية", hours: 3 },
            ],
          },
        ],
      },
    ],
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-institute-blue" />
            الخطط الدراسية
          </h1>
          <p className="text-muted-foreground">إدارة الخطط الدراسية للبرامج الأكاديمية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير الخطة
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            خطة جديدة
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                {studyPlan.program}
              </CardTitle>
              <CardDescription>إجمالي {studyPlan.totalHours} ساعة معتمدة</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {studyPlan.totalHours} ساعة
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="year1">
            <TabsList className="mb-4">
              {studyPlan.years.map((year, index) => (
                <TabsTrigger key={index} value={`year${index + 1}`}>
                  {year.year}
                </TabsTrigger>
              ))}
            </TabsList>

            {studyPlan.years.map((year, yearIndex) => (
              <TabsContent key={yearIndex} value={`year${yearIndex + 1}`}>
                <div className="grid md:grid-cols-2 gap-6">
                  {year.semesters.map((semester, semIndex) => (
                    <motion.div
                      key={semIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: semIndex * 0.1 }}
                    >
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{semester.name}</CardTitle>
                          <CardDescription>
                            {semester.courses.reduce((acc, c) => acc + c.hours, 0)} ساعة
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {semester.courses.map((course, courseIndex) => (
                              <div
                                key={courseIndex}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-institute-blue" />
                                  <div>
                                    <p className="font-medium text-sm">{course.name}</p>
                                    <p className="text-xs text-muted-foreground">{course.code}</p>
                                  </div>
                                </div>
                                <Badge variant="outline">{course.hours} س</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
