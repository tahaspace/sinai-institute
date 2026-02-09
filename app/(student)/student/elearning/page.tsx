"use client"

import { useState } from "react"
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

// Courses Data
const courses = [
  {
    id: 1,
    name: "الرياضيات - الباب الثالث",
    lessons: 12,
    completed: 8,
    duration: "6 ساعات",
    teacher: "أ. محمد أحمد",
    image: "📐",
  },
  {
    id: 2,
    name: "الفيزياء - قوانين نيوتن",
    lessons: 8,
    completed: 5,
    duration: "4 ساعات",
    teacher: "أ. أحمد علي",
    image: "⚛️",
  },
  {
    id: 3,
    name: "الكيمياء - التفاعلات",
    lessons: 10,
    completed: 3,
    duration: "5 ساعات",
    teacher: "أ. خالد سعيد",
    image: "🧪",
  },
]

// Lessons Data
const lessons = [
  { id: 1, title: "مقدمة في التفاضل", duration: "30 دقيقة", type: "video", status: "completed" },
  { id: 2, title: "قواعد الاشتقاق", duration: "45 دقيقة", type: "video", status: "completed" },
  { id: 3, title: "تمارين على الاشتقاق", duration: "20 دقيقة", type: "quiz", status: "completed" },
  { id: 4, title: "التكامل الأساسي", duration: "40 دقيقة", type: "video", status: "current" },
  { id: 5, title: "تطبيقات التكامل", duration: "35 دقيقة", type: "video", status: "locked" },
  { id: 6, title: "اختبار الباب", duration: "60 دقيقة", type: "exam", status: "locked" },
]

// Virtual Classes
const virtualClasses = [
  {
    id: 1,
    subject: "الرياضيات",
    teacher: "أ. محمد أحمد",
    date: "2024-12-26",
    time: "16:00",
    duration: "60 دقيقة",
    status: "upcoming",
  },
  {
    id: 2,
    subject: "الفيزياء",
    teacher: "أ. أحمد علي",
    date: "2024-12-27",
    time: "17:00",
    duration: "45 دقيقة",
    status: "upcoming",
  },
]

// Online Exams
const onlineExams = [
  { id: 1, subject: "الرياضيات", title: "اختبار الباب الثالث", date: "2024-12-28", duration: "60 دقيقة", status: "upcoming" },
  { id: 2, subject: "الفيزياء", title: "اختبار قصير", date: "2024-12-20", duration: "30 دقيقة", status: "completed", grade: 18, maxGrade: 20 },
]

const lessonTypeIcon = {
  video: Video,
  quiz: FileText,
  exam: FileText,
}

export default function StudentElearningPage() {
  const [selectedCourse, setSelectedCourse] = useState(courses[0])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التعلم الإلكتروني</h1>
          <p className="text-muted-foreground">تابع دروسك واختباراتك الإلكترونية</p>
        </div>
      </div>

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
              const progress = (course.completed / course.lessons) * 100

              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">{course.image}</div>
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
                        {course.duration}
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
              <CardTitle>دروس {selectedCourse.name}</CardTitle>
              <CardDescription>
                تقدمك: {selectedCourse.completed}/{selectedCourse.lessons} درس
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const Icon = lessonTypeIcon[lesson.type as keyof typeof lessonTypeIcon]

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
                          {lesson.duration} • {lesson.type === "video" ? "فيديو" : lesson.type === "quiz" ? "تمارين" : "اختبار"}
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
                        <p className="text-sm text-muted-foreground">{cls.teacher}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {new Date(cls.date).toLocaleDateString("ar-EG")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cls.time} • {cls.duration}
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
                          {exam.subject} • {exam.duration}
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
                            {exam.grade}/{exam.maxGrade}
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



