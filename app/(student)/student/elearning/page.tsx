"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Play,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  Users,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Course {
  id: string
  name: string
  teacher: string
  lessons: number
  completed: number
}

interface Lesson {
  id: string
  title: string
  type: "video" | "pdf" | "image" | "audio" | "quiz" | "exam"
  status: "completed" | "current" | "locked"
}

interface VirtualClass {
  id: string
  subject: string
  date: string
  time: string
  status: string
}

interface OnlineExam {
  id: string
  subject: string
  title: string
  date: string
  status: "upcoming" | "completed"
  grade: number | null
  maxGrade: number | null
}

const lessonTypeIcon = {
  video: Video,
  quiz: FileText,
  exam: FileText,
}

export default function StudentElearningPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [virtualClasses, setVirtualClasses] = useState<VirtualClass[]>([])
  const [onlineExams, setOnlineExams] = useState<OnlineExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/elearning`)
        if (!res.ok) throw new Error("فشل في جلب التعلم الإلكتروني")
        const json = await res.json()
        if (!cancelled) {
          setCourses(json.courses ?? [])
          setLessons(json.lessons ?? [])
          setVirtualClasses(json.virtualClasses ?? [])
          setOnlineExams(json.onlineExams ?? [])
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

  const selectedCourse = courses[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التعلم الإلكتروني</h1>
          <p className="text-muted-foreground">تابع دروسك واختباراتك الإلكترونية</p>
        </div>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل التعلم الإلكتروني...</CardContent></Card>}

      {/* Tabs */}
      <Tabs defaultValue="courses">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="courses">المقررات</TabsTrigger>
          <TabsTrigger value="lessons">الدروس</TabsTrigger>
          <TabsTrigger value="classes">الفصول</TabsTrigger>
          <TabsTrigger value="exams">الاختبارات</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const progress = course.lessons > 0 ? (course.completed / course.lessons) * 100 : 0

              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="font-bold mb-1">{course.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{course.teacher}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>التقدم</span>
                        <span>{course.completed}/{course.lessons} درس</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        —
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.lessons} درس
                      </span>
                    </div>
                    <Button className="w-full mt-4">
                      <Play className="w-4 h-4 ml-2" />
                      متابعة التعلم
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>دروس {selectedCourse?.name ?? "المقرر"}</CardTitle>
              <CardDescription>
                تقدمك: {selectedCourse?.completed ?? 0}/{selectedCourse?.lessons ?? 0} درس
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const Icon = lesson.type in lessonTypeIcon
                    ? lessonTypeIcon[lesson.type as keyof typeof lessonTypeIcon]
                    : FileText

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border",
                        lesson.status === "current" && "bg-blue-50 border-blue-200 dark:bg-blue-950/30",
                        lesson.status === "locked" && "opacity-50"
                      )}
                    >
                      <div className="text-center w-8">
                        <span className="text-lg font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        lesson.status === "completed" ? "bg-green-100" :
                        lesson.status === "current" ? "bg-blue-100" :
                        "bg-gray-100"
                      )}>
                        {lesson.status === "locked" ? (
                          <Lock className="w-5 h-5 text-gray-400" />
                        ) : lesson.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Icon className={cn(
                            "w-5 h-5",
                            lesson.status === "current" ? "text-blue-600" : "text-gray-600"
                          )} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {lesson.type === "video" ? "فيديو" : lesson.type === "quiz" ? "تمارين" : lesson.type === "exam" ? "اختبار" : lesson.type === "pdf" ? "ملف PDF" : lesson.type === "image" ? "صورة" : lesson.type === "audio" ? "صوت" : "درس"}
                        </p>
                      </div>
                      {lesson.status === "current" && (
                        <Button size="sm">
                          <Play className="w-4 h-4 ml-2" />
                          متابعة
                        </Button>
                      )}
                      {lesson.status === "completed" && (
                        <Button size="sm" variant="outline">
                          إعادة
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Virtual Classes Tab */}
        <TabsContent value="classes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>الفصول الافتراضية</CardTitle>
              <CardDescription>الحصص المباشرة القادمة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {virtualClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Video className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{cls.subject}</h4>
                        <p className="text-sm text-muted-foreground">—</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {new Date(cls.date).toLocaleDateString("ar-EG")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cls.time}
                      </p>
                    </div>
                    <Button>
                      <Users className="w-4 h-4 ml-2" />
                      انضمام
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Exams Tab */}
        <TabsContent value="exams" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>الاختبارات الإلكترونية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onlineExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        exam.status === "upcoming" ? "bg-orange-100" : "bg-green-100"
                      )}>
                        <FileText className={cn(
                          "w-6 h-6",
                          exam.status === "upcoming" ? "text-orange-600" : "text-green-600"
                        )} />
                      </div>
                      <div>
                        <h4 className="font-medium">{exam.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {exam.subject}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      {exam.status === "upcoming" ? (
                        <>
                          <p className="font-medium">
                            {new Date(exam.date).toLocaleDateString("ar-EG")}
                          </p>
                          <Badge className="bg-orange-100 text-orange-700">قادم</Badge>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-green-600">
                            {exam.grade !== null ? `${exam.grade}/${exam.maxGrade ?? "—"}` : "—"}
                          </p>
                          <Badge className="bg-green-100 text-green-700">مكتمل</Badge>
                        </>
                      )}
                    </div>
                    {exam.status === "upcoming" && (
                      <Button variant="outline">
                        <Calendar className="w-4 h-4 ml-2" />
                        تذكير
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



