"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileSpreadsheet,
  Plus,
  Settings,
  Filter,
  Columns,
  Calendar,
  Save,
  Play,
  Download,
  Clock,
  Trash2,
  Copy,
  Edit,
  Eye,
  Database,
  Table,
  BarChart3,
  Mail,
  Building2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

// مصادر البيانات — إعدادات واجهة ثابتة لأنواع التقارير المتاحة
const dataSources = [
  { id: "tuition", name: "الرسوم الدراسية", icon: "🎓" },
  { id: "installments", name: "الأقساط", icon: "📅" },
  { id: "scholarships", name: "المنح والإعفاءات", icon: "🏆" },
  { id: "payroll", name: "الرواتب", icon: "💰" },
]

// التقرير المحفوظ — كما يُعاد من /api/institute/finance/report-builder
interface SavedReport {
  id: string
  name: string
  description: string
  source: string
  lastRun: string
  schedule: string
  createdBy: string
}

// صف معاينة الرسوم لكل طالب — كما يُعاد من نفس المسار
interface PreviewRow {
  student_id: string
  student_name: string
  department: string
  level: number
  total_fees: number
  paid_amount: number
  remaining: number
  status: string
}

// حقول الرسوم
const tuitionFields = [
  { name: "student_id", label: "رقم الطالب" },
  { name: "student_name", label: "اسم الطالب" },
  { name: "department", label: "القسم" },
  { name: "level", label: "المستوى" },
  { name: "total_fees", label: "إجمالي الرسوم" },
  { name: "paid_amount", label: "المدفوع" },
  { name: "remaining", label: "المتبقي" },
  { name: "status", label: "الحالة" },
]

export default function InstituteReportBuilderPage() {
  const [activeTab, setActiveTab] = useState("builder")
  const [selectedSource, setSelectedSource] = useState("")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/finance/report-builder")
        if (!res.ok) throw new Error("فشل تحميل البيانات")
        const json = await res.json()
        if (!cancelled) {
          setSavedReports(json.savedReports ?? [])
          setPreviewData(json.previewData ?? [])
        }
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
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-institute-blue" />
            منشئ التقارير - المعهد العالي
          </h1>
          <p className="text-muted-foreground">
            صمم تقاريرك المالية المخصصة
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          تقرير جديد
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      )}
      {error && (
        <Card className="border-red-300">
          <CardContent className="py-4 text-red-600">{error}</CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="builder">منشئ التقارير</TabsTrigger>
          <TabsTrigger value="saved">المحفوظة</TabsTrigger>
          <TabsTrigger value="scheduled">الجدولة</TabsTrigger>
        </TabsList>

        {/* منشئ التقارير */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {/* إعدادات */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    الإعدادات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>اسم التقرير</Label>
                    <Input placeholder="أدخل اسم التقرير" />
                  </div>
                  <div>
                    <Label>القسم</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="كل الأقسام" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأقسام</SelectItem>
                        <SelectItem value="cs">الحاسبات والمعلومات</SelectItem>
                        <SelectItem value="ba">إدارة الأعمال</SelectItem>
                        <SelectItem value="eng">الهندسة</SelectItem>
                        <SelectItem value="acc">المحاسبة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* مصدر البيانات */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    مصدر البيانات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dataSources.map((source) => (
                      <div
                        key={source.id}
                        onClick={() => setSelectedSource(source.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSource === source.id
                            ? "border-institute-blue bg-institute-blue dark:bg-institute-blue/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{source.icon}</span>
                          <span className="font-medium">{source.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* اختيار الحقول */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Columns className="h-5 w-5" />
                    الحقول
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSource === "tuition" ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {tuitionFields.map((field) => (
                        <div
                          key={field.name}
                          className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                            selectedFields.includes(field.name)
                              ? "border-institute-blue bg-institute-blue dark:bg-institute-blue/20"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleField(field.name)}
                        >
                          <Checkbox checked={selectedFields.includes(field.name)} />
                          <span className="text-sm">{field.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      اختر مصدر البيانات أولاً
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* أزرار */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 ml-2" />
                  معاينة
                </Button>
                <Button variant="outline">
                  <Save className="h-4 w-4 ml-2" />
                  حفظ
                </Button>
                <Button>
                  <Play className="h-4 w-4 ml-2" />
                  تشغيل
                </Button>
              </div>

              {/* معاينة */}
              {showPreview && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>معاينة التقرير</CardTitle>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 ml-2" />
                        تصدير
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border p-2 text-right">الطالب</th>
                            <th className="border p-2 text-right">القسم</th>
                            <th className="border p-2 text-right">المستوى</th>
                            <th className="border p-2 text-right">الرسوم</th>
                            <th className="border p-2 text-right">المدفوع</th>
                            <th className="border p-2 text-right">المتبقي</th>
                            <th className="border p-2 text-right">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="border p-4 text-center text-muted-foreground">
                                لا توجد بيانات للعرض
                              </td>
                            </tr>
                          ) : (
                            previewData.map((row, index) => (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="border p-2">{row.student_name}</td>
                                <td className="border p-2">{row.department}</td>
                                <td className="border p-2">{row.level}</td>
                                <td className="border p-2 font-mono">{formatCurrency(row.total_fees)}</td>
                                <td className="border p-2 font-mono text-institute-blue">{formatCurrency(row.paid_amount)}</td>
                                <td className="border p-2 font-mono text-red-600">{formatCurrency(row.remaining)}</td>
                                <td className="border p-2">
                                  <Badge variant={row.status === "مكتمل" ? "default" : row.status === "جزئي" ? "secondary" : "destructive"}>
                                    {row.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* التقارير المحفوظة */}
        <TabsContent value="saved" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{report.schedule}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex justify-between">
                      <span>آخر تشغيل:</span>
                      <span>{report.lastRun}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>أنشأه:</span>
                      <span>{report.createdBy}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="h-3 w-3 ml-1" />
                      تشغيل
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* جدولة */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                جدولة التقارير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch defaultChecked />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">{report.schedule}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select defaultValue={report.schedule === "شهري" ? "monthly" : "weekly"}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">أسبوعي</SelectItem>
                          <SelectItem value="monthly">شهري</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 ml-2" />
                        البريد
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
