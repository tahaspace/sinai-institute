"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Database,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  BookOpen,
  HelpCircle,
  CheckSquare,
  MessageSquare,
  MoreVertical,
  Layers,
  ListChecks,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// API types
interface ApiCourse {
  id: string
  code: string
  nameAr: string
}

interface ApiQuestion {
  id: string
  text: string
  type: string
  difficulty: string
  course: string
  courseCode: string
  courseId: string
}

interface QuestionsResponse {
  questions: ApiQuestion[]
  courses: ApiCourse[]
  stats: { total: number; mcq: number; essay: number; truefalse: number }
}

// View model for the table — derived from ApiQuestion. Fields not provided by the
// API (options/points/usage/tags) are kept neutral so the existing UI stays intact.
interface QuestionView {
  id: string
  courseId: string
  courseCode: string
  courseName: string
  type: string
  question: string
  difficulty: string
  points: number
  tags: string[]
  usageCount: number
}

const questionTypes = [
  { id: "mcq", name: "اختيار من متعدد", icon: ListChecks },
  { id: "true_false", name: "صح / خطأ", icon: CheckSquare },
  { id: "essay", name: "مقالي", icon: MessageSquare },
  { id: "fill_blank", name: "ملء الفراغات", icon: HelpCircle },
]

const difficultyLevels = [
  { id: "easy", name: "سهل", color: "bg-institute-blue text-green-700" },
  { id: "medium", name: "متوسط", color: "bg-amber-100 text-amber-700" },
  { id: "hard", name: "صعب", color: "bg-red-100 text-red-700" },
]

export default function OnlineQuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionView[]>([])
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [stats, setStats] = useState({ total: 0, mcq: 0, trueFalse: 0, essay: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])

  // New Question Form State
  const [newQuestion, setNewQuestion] = useState({
    courseCode: "",
    type: "mcq",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    correctAnswerBool: true,
    difficulty: "medium",
    points: 2,
    tags: "",
  })

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/institute/exams/questions")
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || "فشل في جلب الأسئلة")
      }
      const json = (await res.json()) as QuestionsResponse
      setQuestions(
        (json.questions ?? []).map((q) => ({
          id: q.id,
          courseId: q.courseId,
          courseCode: q.courseCode,
          courseName: q.course,
          type: q.type,
          question: q.text,
          difficulty: q.difficulty,
          points: 0,
          tags: [],
          usageCount: 0,
        }))
      )
      setCourses(json.courses ?? [])
      setStats({
        total: json.stats?.total ?? 0,
        mcq: json.stats?.mcq ?? 0,
        trueFalse: json.stats?.truefalse ?? 0,
        essay: json.stats?.essay ?? 0,
      })
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async function load() {
      if (cancelled) return
      await reload()
    })()
    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  const filteredQuestions = questions.filter(q => {
    const matchesSearch =
      q.question.includes(searchQuery) ||
      q.courseName.includes(searchQuery) ||
      q.courseCode.includes(searchQuery)
    const matchesCourse = courseFilter === "all" || q.courseCode === courseFilter
    const matchesType = typeFilter === "all" || q.type === typeFilter
    const matchesDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter
    return matchesSearch && matchesCourse && matchesType && matchesDifficulty
  })

  const handleAddQuestion = async () => {
    const courseId =
      courses.find(c => c.code === newQuestion.courseCode)?.id || newQuestion.courseCode
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/institute/exams/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          text: newQuestion.question,
          type: newQuestion.type,
          difficulty: newQuestion.difficulty,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || "فشل في إضافة السؤال")
      }
      setShowAddDialog(false)
      setNewQuestion({
        courseCode: "",
        type: "mcq",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        correctAnswerBool: true,
        difficulty: "medium",
        points: 2,
        tags: "",
      })
      await reload()
      setSuccess("تم إضافة السؤال بنجاح")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/institute/exams/questions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || "فشل في حذف السؤال")
      }
      setSelectedQuestions(prev => prev.filter(q => q !== id))
      await reload()
      setSuccess("تم حذف السؤال بنجاح")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  const selectAllQuestions = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id))
    }
  }

  const getQuestionTypeIcon = (type: string) => {
    const typeConfig = questionTypes.find(t => t.id === type)
    return typeConfig?.icon || HelpCircle
  }

  const getQuestionTypeName = (type: string) => {
    return questionTypes.find(t => t.id === type)?.name || type
  }

  const getDifficultyBadge = (difficulty: string) => {
    const config = difficultyLevels.find(d => d.id === difficulty)
    return config || { name: difficulty, color: "bg-gray-100 text-gray-700" }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-7 h-7 text-institute-blue" />
            بنك أسئلة الامتحانات الأونلاين
          </h1>
          <p className="text-muted-foreground">
            إدارة وتنظيم أسئلة الامتحانات الإلكترونية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 ml-2" />
            استيراد CSV
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-institute-blue hover:bg-institute-blue">
            <Plus className="w-4 h-4 ml-2" />
            إضافة سؤال
          </Button>
        </div>
      </div>

      {/* Status indicators */}
      {error && (
        <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-institute-blue/10 dark:bg-institute-blue/20 border-institute-blue">
          <CheckCircle2 className="h-4 w-4 text-institute-blue" />
          <AlertDescription className="text-institute-blue">{success}</AlertDescription>
        </Alert>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground">جاري تحميل الأسئلة...</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأسئلة</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <Database className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">اختيار من متعدد</p>
                <p className="text-2xl font-bold">{stats.mcq}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">صح / خطأ</p>
                <p className="text-2xl font-bold">{stats.trueFalse}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-blue dark:bg-institute-blue/30 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-institute-blue" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مقالي</p>
                <p className="text-2xl font-bold">{stats.essay}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-institute-gold dark:bg-institute-gold/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-institute-gold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الأسئلة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <BookOpen className="w-4 h-4 ml-2" />
                <SelectValue placeholder="المقرر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المقررات</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.code}>
                    {course.code} - {course.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <Layers className="w-4 h-4 ml-2" />
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {questionTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="الصعوبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                {difficultyLevels.map(level => (
                  <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Selected Actions */}
      {selectedQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="bg-institute-blue dark:bg-institute-blue/20 border-institute-blue">
            <CheckCircle2 className="h-4 w-4 text-institute-blue" />
            <AlertDescription className="flex items-center justify-between">
              <span>تم تحديد {selectedQuestions.length} سؤال</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  disabled={saving}
                  onClick={async () => {
                    for (const id of selectedQuestions) {
                      await handleDeleteQuestion(id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Questions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                    onCheckedChange={selectAllQuestions}
                  />
                </TableHead>
                <TableHead className="w-20">الكود</TableHead>
                <TableHead>السؤال</TableHead>
                <TableHead>المقرر</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الصعوبة</TableHead>
                <TableHead>الدرجة</TableHead>
                <TableHead>الاستخدام</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((question) => {
                const TypeIcon = getQuestionTypeIcon(question.type)
                const difficulty = getDifficultyBadge(question.difficulty)
                
                return (
                  <TableRow key={question.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={() => toggleQuestionSelection(question.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{question.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="line-clamp-2">{question.question}</p>
                        <div className="flex gap-1 mt-1">
                          {question.tags?.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{question.courseCode}</p>
                        <p className="text-xs text-muted-foreground">{question.courseName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="w-3 h-3" />
                        {getQuestionTypeName(question.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={difficulty.color}>
                        {difficulty.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{question.points}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{question.usageCount} مرة</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 ml-2" />
                            نسخ
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            disabled={saving}
                            onSelect={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد أسئلة تطابق البحث</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة سؤال جديد
            </DialogTitle>
            <DialogDescription>
              أضف سؤالاً جديداً لبنك الأسئلة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Course Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المقرر الدراسي *</Label>
                <Select 
                  value={newQuestion.courseCode} 
                  onValueChange={(v) => setNewQuestion({...newQuestion, courseCode: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المقرر" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.code}>
                        {course.code} - {course.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع السؤال *</Label>
                <Select 
                  value={newQuestion.type} 
                  onValueChange={(v) => setNewQuestion({...newQuestion, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <span className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>نص السؤال *</Label>
              <Textarea
                placeholder="اكتب السؤال هنا..."
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                rows={3}
              />
            </div>

            {/* MCQ Options */}
            {newQuestion.type === "mcq" && (
              <div className="space-y-3">
                <Label>الاختيارات *</Label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <RadioGroup
                      value={String(newQuestion.correctAnswer)}
                      onValueChange={(v) => setNewQuestion({...newQuestion, correctAnswer: parseInt(v)})}
                    >
                      <RadioGroupItem value={String(index)} />
                    </RadioGroup>
                    <Input
                      placeholder={`الاختيار ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options]
                        newOptions[index] = e.target.value
                        setNewQuestion({...newQuestion, options: newOptions})
                      }}
                      className={cn(
                        newQuestion.correctAnswer === index && "border-institute-blue bg-institute-blue"
                      )}
                    />
                    {index === newQuestion.correctAnswer && (
                      <Badge className="bg-institute-blue text-green-700">الإجابة الصحيحة</Badge>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewQuestion({
                    ...newQuestion,
                    options: [...newQuestion.options, ""]
                  })}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة اختيار
                </Button>
              </div>
            )}

            {/* True/False */}
            {newQuestion.type === "true_false" && (
              <div className="space-y-2">
                <Label>الإجابة الصحيحة *</Label>
                <RadioGroup
                  value={String(newQuestion.correctAnswerBool)}
                  onValueChange={(v) => setNewQuestion({...newQuestion, correctAnswerBool: v === "true"})}
                  className="flex gap-4"
                >
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer",
                    newQuestion.correctAnswerBool && "border-institute-blue bg-institute-blue"
                  )}>
                    <RadioGroupItem value="true" />
                    <Label>صح</Label>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer",
                    !newQuestion.correctAnswerBool && "border-red-500 bg-red-50"
                  )}>
                    <RadioGroupItem value="false" />
                    <Label>خطأ</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Essay Note */}
            {newQuestion.type === "essay" && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  الأسئلة المقالية تتطلب تصحيحاً يدوياً من عضو هيئة التدريس
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Difficulty & Points */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>مستوى الصعوبة *</Label>
                <Select 
                  value={newQuestion.difficulty} 
                  onValueChange={(v) => setNewQuestion({...newQuestion, difficulty: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => (
                      <SelectItem key={level.id} value={level.id}>
                        <Badge className={level.color}>{level.name}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الدرجة *</Label>
                <Input
                  type="number"
                  min={1}
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>الوسوم (Tags)</Label>
                <Input
                  placeholder="فصل بفاصلة (,)"
                  value={newQuestion.tags}
                  onChange={(e) => setNewQuestion({...newQuestion, tags: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button
              onClick={handleAddQuestion}
              disabled={!newQuestion.courseCode || !newQuestion.question || saving}
              className="bg-institute-blue hover:bg-institute-blue"
            >
              <Plus className="w-4 h-4 ml-2" />
              {saving ? "جاري الإضافة..." : "إضافة السؤال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              استيراد أسئلة من ملف CSV
            </DialogTitle>
            <DialogDescription>
              قم برفع ملف CSV يحتوي على الأسئلة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">تنسيق الملف المطلوب:</p>
                <code className="text-xs bg-muted p-2 rounded block" dir="ltr">
                  course_code, course_name, question_type, question_text, options, correct_answer, difficulty, points
                </code>
              </AlertDescription>
            </Alert>
            
            <div className="border-2 border-dashed rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">اسحب الملف هنا أو</p>
              <Button variant="outline">
                <Upload className="w-4 h-4 ml-2" />
                اختر ملف
              </Button>
              <p className="text-xs text-muted-foreground mt-2">CSV, Excel (حتى 5MB)</p>
            </div>

            <Button variant="link" className="w-full">
              <Download className="w-4 h-4 ml-2" />
              تحميل نموذج CSV
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>إلغاء</Button>
            <Button className="bg-institute-blue hover:bg-institute-blue">
              <Upload className="w-4 h-4 ml-2" />
              استيراد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
