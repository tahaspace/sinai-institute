"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  FileEdit,
  BookOpen,
  Calendar,
  Clock,
  Users,
  Settings,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
  Search,
  Filter,
  Eye,
  Shuffle,
  Lock,
  Unlock,
  Timer,
  RotateCcw,
  Save,
  ArrowLeft,
  ArrowRight,
  ListChecks,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Mock Data
const courses = [
  { id: "CS101", code: "CS101", name: "مقدمة في البرمجة" },
  { id: "CS201", code: "CS201", name: "هياكل البيانات" },
  { id: "CS301", code: "CS301", name: "قواعد البيانات" },
  { id: "NET101", code: "NET101", name: "شبكات الحاسب" },
  { id: "ACC101", code: "ACC101", name: "مبادئ المحاسبة" },
]

const semesters = [
  { id: "fall2024", name: "الفصل الأول 2024/2025" },
  { id: "spring2025", name: "الفصل الثاني 2024/2025" },
  { id: "summer2025", name: "الفصل الصيفي 2025" },
]

const sections = [
  { id: "A", name: "الشعبة A" },
  { id: "B", name: "الشعبة B" },
  { id: "C", name: "الشعبة C" },
  { id: "all", name: "جميع الشعب" },
]

const questionBank = [
  {
    id: "Q001",
    type: "mcq",
    question: "ما هي لغة البرمجة المستخدمة في تطوير Android؟",
    difficulty: "easy",
    points: 2,
  },
  {
    id: "Q002",
    type: "true_false",
    question: "يمكن استخدام Python لتطوير تطبيقات الويب",
    difficulty: "easy",
    points: 1,
  },
  {
    id: "Q003",
    type: "mcq",
    question: "ما هو التعقيد الزمني لعملية البحث في Binary Search Tree متوازنة؟",
    difficulty: "medium",
    points: 3,
  },
  {
    id: "Q004",
    type: "essay",
    question: "اشرح الفرق بين SQL و NoSQL مع ذكر أمثلة لكل نوع",
    difficulty: "hard",
    points: 10,
  },
  {
    id: "Q005",
    type: "mcq",
    question: "أي من التالي ليس من أنواع الحلقات التكرارية في Java؟",
    difficulty: "easy",
    points: 2,
  },
  {
    id: "Q006",
    type: "mcq",
    question: "ما هو الفرق الأساسي بين Stack و Queue؟",
    difficulty: "medium",
    points: 3,
  },
  {
    id: "Q007",
    type: "true_false",
    question: "الخوارزمية هي مجموعة من الخطوات المحددة لحل مشكلة ما",
    difficulty: "easy",
    points: 1,
  },
  {
    id: "Q008",
    type: "essay",
    question: "صف خطوات تصميم قاعدة بيانات علائقية لنظام مكتبة",
    difficulty: "hard",
    points: 15,
  },
]

const steps = [
  { id: 1, title: "المعلومات الأساسية", icon: FileEdit },
  { id: 2, title: "اختيار الأسئلة", icon: ListChecks },
  { id: 3, title: "إعدادات الوقت", icon: Clock },
  { id: 4, title: "الإعدادات المتقدمة", icon: Settings },
  { id: 5, title: "المراجعة والنشر", icon: CheckCircle2 },
]

const questionTypeIcons: Record<string, React.ElementType> = {
  mcq: ListChecks,
  true_false: CheckSquare,
  essay: MessageSquare,
  fill_blank: HelpCircle,
}

const difficultyColors: Record<string, string> = {
  easy: "bg-institute-blue text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
}

const difficultyNames: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
}

export default function CreateOnlineExamPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form State
  const [examData, setExamData] = useState({
    // Step 1: Basic Info
    name: "",
    description: "",
    courseCode: "",
    semester: "",
    section: "all",
    
    // Step 2: Questions
    selectedQuestions: [] as string[],
    
    // Step 3: Time Settings
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    duration: 60, // minutes
    lateEntry: 5, // minutes allowed for late entry
    maxAttempts: 1,
    
    // Step 4: Advanced Settings
    shuffleQuestions: true,
    shuffleOptions: true,
    showResults: "immediate", // immediate, after_end, manual
    resultsDate: "",
    passingScore: 50,
    preventCopy: true,
    preventPrint: true,
    preventScreenshot: true,
    fullScreen: true,
    showQuestionNavigation: true,
    autoSubmit: true,
  })

  const [questionSearch, setQuestionSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")

  const filteredQuestions = questionBank.filter(q => {
    const matchesSearch = q.question.includes(questionSearch)
    const matchesDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

  const selectedQuestionsData = questionBank.filter(q => 
    examData.selectedQuestions.includes(q.id)
  )
  
  const totalPoints = selectedQuestionsData.reduce((sum, q) => sum + q.points, 0)

  const toggleQuestion = (id: string) => {
    setExamData(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.includes(id)
        ? prev.selectedQuestions.filter(q => q !== id)
        : [...prev.selectedQuestions, id]
    }))
  }

  const selectAllQuestions = () => {
    setExamData(prev => ({
      ...prev,
      selectedQuestions: filteredQuestions.map(q => q.id)
    }))
  }

  const clearAllQuestions = () => {
    setExamData(prev => ({
      ...prev,
      selectedQuestions: []
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return examData.name && examData.courseCode && examData.semester
      case 2:
        return examData.selectedQuestions.length > 0
      case 3:
        return examData.startDate && examData.startTime && examData.duration > 0
      case 4:
        return true
      default:
        return true
    }
  }

  const nextStep = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    console.log("Exam Data:", examData)
    router.push("/institute/online-exams")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileEdit className="w-7 h-7 text-institute-blue" />
            إنشاء امتحان أونلاين جديد
          </h1>
          <p className="text-muted-foreground">
            أنشئ امتحاناً إلكترونياً جديداً للطلاب
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="w-4 h-4 ml-2" />
          رجوع
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    currentStep === step.id
                      ? "bg-institute-blue text-white"
                      : currentStep > step.id
                      ? "bg-institute-blue text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-1 w-12 md:w-24 mx-2 rounded",
                      currentStep > step.id ? "bg-institute-blue" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="font-medium">{steps[currentStep - 1].title}</p>
            <p className="text-sm text-muted-foreground">
              الخطوة {currentStep} من {steps.length}
            </p>
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="mt-4" />
        </CardContent>
      </Card>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-5 h-5" />
                المعلومات الأساسية
              </CardTitle>
              <CardDescription>
                أدخل المعلومات الأساسية للامتحان
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>اسم الامتحان *</Label>
                <Input
                  placeholder="مثال: امتحان منتصف الفصل - مقدمة في البرمجة"
                  value={examData.name}
                  onChange={(e) => setExamData({...examData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>وصف الامتحان</Label>
                <Textarea
                  placeholder="وصف مختصر للامتحان وتعليمات للطلاب..."
                  value={examData.description}
                  onChange={(e) => setExamData({...examData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>المقرر الدراسي *</Label>
                  <Select 
                    value={examData.courseCode} 
                    onValueChange={(v) => setExamData({...examData, courseCode: v})}
                  >
                    <SelectTrigger>
                      <BookOpen className="w-4 h-4 ml-2" />
                      <SelectValue placeholder="اختر المقرر" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.code}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الفصل الدراسي *</Label>
                  <Select 
                    value={examData.semester} 
                    onValueChange={(v) => setExamData({...examData, semester: v})}
                  >
                    <SelectTrigger>
                      <Calendar className="w-4 h-4 ml-2" />
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map(sem => (
                        <SelectItem key={sem.id} value={sem.id}>{sem.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الشعبة</Label>
                  <Select 
                    value={examData.section} 
                    onValueChange={(v) => setExamData({...examData, section: v})}
                  >
                    <SelectTrigger>
                      <Users className="w-4 h-4 ml-2" />
                      <SelectValue placeholder="اختر الشعبة" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(sec => (
                        <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Questions */}
        {currentStep === 2 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Question Bank */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="w-5 h-5" />
                      بنك الأسئلة
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllQuestions}>
                        تحديد الكل
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearAllQuestions}>
                        إلغاء التحديد
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <div className="flex-1 relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في الأسئلة..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="w-4 h-4 ml-2" />
                        <SelectValue placeholder="الصعوبة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="easy">سهل</SelectItem>
                        <SelectItem value="medium">متوسط</SelectItem>
                        <SelectItem value="hard">صعب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>السؤال</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الصعوبة</TableHead>
                        <TableHead>الدرجة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((q) => {
                        const TypeIcon = questionTypeIcons[q.type] || HelpCircle
                        const isSelected = examData.selectedQuestions.includes(q.id)
                        
                        return (
                          <TableRow 
                            key={q.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              isSelected && "bg-institute-blue dark:bg-institute-blue/20"
                            )}
                            onClick={() => toggleQuestion(q.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleQuestion(q.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="line-clamp-2">{q.question}</p>
                            </TableCell>
                            <TableCell>
                              <TypeIcon className="w-4 h-4" />
                            </TableCell>
                            <TableCell>
                              <Badge className={difficultyColors[q.difficulty]}>
                                {difficultyNames[q.difficulty]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold">{q.points}</span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Selected Questions Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  الأسئلة المختارة
                </CardTitle>
                <CardDescription>
                  {examData.selectedQuestions.length} سؤال | {totalPoints} درجة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedQuestionsData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لم يتم اختيار أي سؤال</p>
                  </div>
                ) : (
                  selectedQuestionsData.map((q, index) => (
                    <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="w-6 h-6 rounded-full bg-institute-blue text-institute-blue text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm line-clamp-1">{q.question}</p>
                      <Badge variant="outline" className="text-xs">{q.points}</Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleQuestion(q.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Time Settings */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                إعدادات الوقت
              </CardTitle>
              <CardDescription>
                حدد موعد ومدة الامتحان
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    تاريخ ووقت البدء
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>التاريخ *</Label>
                      <Input
                        type="date"
                        value={examData.startDate}
                        onChange={(e) => setExamData({...examData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوقت *</Label>
                      <Input
                        type="time"
                        value={examData.startTime}
                        onChange={(e) => setExamData({...examData, startTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    تاريخ ووقت الانتهاء (اختياري)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={examData.endDate}
                        onChange={(e) => setExamData({...examData, endDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوقت</Label>
                      <Input
                        type="time"
                        value={examData.endTime}
                        onChange={(e) => setExamData({...examData, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    مدة الامتحان (بالدقائق) *
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={examData.duration}
                    onChange={(e) => setExamData({...examData, duration: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground">
                    = {Math.floor(examData.duration / 60)} ساعة و {examData.duration % 60} دقيقة
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    السماح بالتأخير (بالدقائق)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={examData.lateEntry}
                    onChange={(e) => setExamData({...examData, lateEntry: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground">
                    السماح للطالب بالدخول بعد بدء الامتحان
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    عدد محاولات الدخول
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={examData.maxAttempts}
                    onChange={(e) => setExamData({...examData, maxAttempts: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground">
                    في حالة انقطاع الاتصال
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Advanced Settings */}
        {currentStep === 4 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="w-5 h-5" />
                  إعدادات العرض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>خلط ترتيب الأسئلة</Label>
                    <p className="text-xs text-muted-foreground">
                      عرض الأسئلة بترتيب عشوائي لكل طالب
                    </p>
                  </div>
                  <Switch
                    checked={examData.shuffleQuestions}
                    onCheckedChange={(v) => setExamData({...examData, shuffleQuestions: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>خلط ترتيب الإجابات</Label>
                    <p className="text-xs text-muted-foreground">
                      عرض اختيارات MCQ بترتيب عشوائي
                    </p>
                  </div>
                  <Switch
                    checked={examData.shuffleOptions}
                    onCheckedChange={(v) => setExamData({...examData, shuffleOptions: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>شريط التنقل بين الأسئلة</Label>
                    <p className="text-xs text-muted-foreground">
                      السماح بالتنقل بين الأسئلة
                    </p>
                  </div>
                  <Switch
                    checked={examData.showQuestionNavigation}
                    onCheckedChange={(v) => setExamData({...examData, showQuestionNavigation: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>التسليم التلقائي</Label>
                    <p className="text-xs text-muted-foreground">
                      تسليم الامتحان تلقائياً عند انتهاء الوقت
                    </p>
                  </div>
                  <Switch
                    checked={examData.autoSubmit}
                    onCheckedChange={(v) => setExamData({...examData, autoSubmit: v})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  الحماية من الغش
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>منع النسخ واللصق</Label>
                    <p className="text-xs text-muted-foreground">
                      تعطيل Copy/Paste أثناء الامتحان
                    </p>
                  </div>
                  <Switch
                    checked={examData.preventCopy}
                    onCheckedChange={(v) => setExamData({...examData, preventCopy: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>منع الطباعة</Label>
                    <p className="text-xs text-muted-foreground">
                      تعطيل طباعة الصفحة
                    </p>
                  </div>
                  <Switch
                    checked={examData.preventPrint}
                    onCheckedChange={(v) => setExamData({...examData, preventPrint: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>منع لقطات الشاشة</Label>
                    <p className="text-xs text-muted-foreground">
                      محاولة منع Screenshots
                    </p>
                  </div>
                  <Switch
                    checked={examData.preventScreenshot}
                    onCheckedChange={(v) => setExamData({...examData, preventScreenshot: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>وضع ملء الشاشة</Label>
                    <p className="text-xs text-muted-foreground">
                      إجبار الطالب على وضع Full Screen
                    </p>
                  </div>
                  <Switch
                    checked={examData.fullScreen}
                    onCheckedChange={(v) => setExamData({...examData, fullScreen: v})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  إعدادات النتائج
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>موعد ظهور النتيجة</Label>
                  <RadioGroup
                    value={examData.showResults}
                    onValueChange={(v) => setExamData({...examData, showResults: v})}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className={cn(
                      "flex items-center gap-2 p-4 rounded-lg border cursor-pointer",
                      examData.showResults === "immediate" && "border-institute-blue bg-institute-blue"
                    )}>
                      <RadioGroupItem value="immediate" />
                      <div>
                        <Label>فوري</Label>
                        <p className="text-xs text-muted-foreground">بعد التسليم مباشرة</p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 p-4 rounded-lg border cursor-pointer",
                      examData.showResults === "after_end" && "border-institute-blue bg-institute-blue"
                    )}>
                      <RadioGroupItem value="after_end" />
                      <div>
                        <Label>بعد انتهاء الامتحان</Label>
                        <p className="text-xs text-muted-foreground">لجميع الطلاب</p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 p-4 rounded-lg border cursor-pointer",
                      examData.showResults === "manual" && "border-institute-blue bg-institute-blue"
                    )}>
                      <RadioGroupItem value="manual" />
                      <div>
                        <Label>تاريخ محدد</Label>
                        <p className="text-xs text-muted-foreground">حدد التاريخ</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {examData.showResults === "manual" && (
                  <div className="space-y-2">
                    <Label>تاريخ ظهور النتائج</Label>
                    <Input
                      type="datetime-local"
                      value={examData.resultsDate}
                      onChange={(e) => setExamData({...examData, resultsDate: e.target.value})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>درجة النجاح (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={examData.passingScore}
                    onChange={(e) => setExamData({...examData, passingScore: parseInt(e.target.value)})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                مراجعة الامتحان
              </CardTitle>
              <CardDescription>
                راجع جميع إعدادات الامتحان قبل النشر
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">المعلومات الأساسية</h4>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p><span className="text-muted-foreground">الاسم:</span> {examData.name}</p>
                    <p><span className="text-muted-foreground">المقرر:</span> {courses.find(c => c.code === examData.courseCode)?.name}</p>
                    <p><span className="text-muted-foreground">الفصل:</span> {semesters.find(s => s.id === examData.semester)?.name}</p>
                    <p><span className="text-muted-foreground">الشعبة:</span> {sections.find(s => s.id === examData.section)?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">الأسئلة والدرجات</h4>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p><span className="text-muted-foreground">عدد الأسئلة:</span> {examData.selectedQuestions.length} سؤال</p>
                    <p><span className="text-muted-foreground">إجمالي الدرجات:</span> {totalPoints} درجة</p>
                    <p><span className="text-muted-foreground">درجة النجاح:</span> {examData.passingScore}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">إعدادات الوقت</h4>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p><span className="text-muted-foreground">البدء:</span> {examData.startDate} الساعة {examData.startTime}</p>
                    <p><span className="text-muted-foreground">المدة:</span> {examData.duration} دقيقة</p>
                    <p><span className="text-muted-foreground">السماح بالتأخير:</span> {examData.lateEntry} دقيقة</p>
                    <p><span className="text-muted-foreground">عدد المحاولات:</span> {examData.maxAttempts}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">الإعدادات المتقدمة</h4>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p><span className="text-muted-foreground">خلط الأسئلة:</span> {examData.shuffleQuestions ? "نعم" : "لا"}</p>
                    <p><span className="text-muted-foreground">خلط الإجابات:</span> {examData.shuffleOptions ? "نعم" : "لا"}</p>
                    <p><span className="text-muted-foreground">منع الغش:</span> {examData.preventCopy ? "مفعل" : "معطل"}</p>
                    <p><span className="text-muted-foreground">ظهور النتائج:</span> {
                      examData.showResults === "immediate" ? "فوري" :
                      examData.showResults === "after_end" ? "بعد انتهاء الامتحان" : "تاريخ محدد"
                    }</p>
                  </div>
                </div>
              </div>

              <Alert className="bg-institute-blue dark:bg-institute-blue/20 border-institute-blue">
                <CheckCircle2 className="h-4 w-4 text-institute-blue" />
                <AlertDescription>
                  بعد النشر، سيتمكن الطلاب من رؤية الامتحان في بوابتهم والدخول إليه في الموعد المحدد.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronRight className="w-4 h-4 ml-2" />
          السابق
        </Button>

        {currentStep < 5 ? (
          <Button 
            onClick={nextStep}
            disabled={!canProceed()}
            className="bg-institute-blue hover:bg-institute-blue"
          >
            التالي
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            className="bg-institute-blue hover:bg-institute-blue"
          >
            <CheckCircle2 className="w-4 h-4 ml-2" />
            نشر الامتحان
          </Button>
        )}
      </div>
    </div>
  )
}
