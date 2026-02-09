"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Shield,
  Lock,
  Copy,
  Printer,
  Camera,
  Download,
  Droplets,
  Eye,
  AlertTriangle,
  Save,
  RotateCcw,
  FileText,
  Video,
  Image as ImageIcon,
  Settings,
  History,
} from "lucide-react"
import { toast } from "sonner"

export default function ContentProtectionPage() {
  const [settings, setSettings] = useState({
    // General
    drmEnabled: true,
    
    // Watermark
    watermarkEnabled: true,
    watermarkType: "user-info",
    watermarkPosition: "tile",
    watermarkOpacity: 15,
    
    // Copy Protection
    preventCopy: true,
    preventPrint: true,
    preventScreenshot: true,
    preventRightClick: true,
    preventDownload: true,
    
    // Content Types
    protectVideos: true,
    protectDocuments: true,
    protectImages: true,
  })

  const accessLogs = [
    { id: "1", user: "أحمد محمد", action: "محاولة نسخ", content: "درس الرياضيات", time: "منذ 5 دقائق", blocked: true },
    { id: "2", user: "فاطمة علي", action: "محاولة طباعة", content: "ملف PDF", time: "منذ 15 دقيقة", blocked: true },
    { id: "3", user: "عمر حسن", action: "تحميل معتمد", content: "مادة مسموح بها", time: "منذ ساعة", blocked: false },
    { id: "4", user: "ليلى أحمد", action: "محاولة screenshot", content: "فيديو تعليمي", time: "منذ ساعتين", blocked: true },
  ]

  const stats = {
    blockedAttempts: 156,
    protectedContent: 342,
    activeUsers: 89,
    violationRate: "2.3%",
  }

  const handleSave = () => {
    toast.success("تم حفظ إعدادات الحماية")
  }

  const handleReset = () => {
    toast.info("تم إعادة تعيين الإعدادات")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            حماية المحتوى DRM
          </h1>
          <p className="text-muted-foreground">
            إدارة حماية المحتوى الرقمي ومنع النسخ غير المصرح
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة تعيين
          </Button>
          <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 ml-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Master Toggle */}
      <Card className={settings.drmEnabled ? "border-red-500/50" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">تفعيل حماية المحتوى</h3>
                <p className="text-sm text-muted-foreground">
                  تشغيل نظام حماية المحتوى الرقمي
                </p>
              </div>
            </div>
            <Switch
              checked={settings.drmEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, drmEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "محاولات محظورة", value: stats.blockedAttempts, icon: AlertTriangle, color: "text-red-600" },
          { label: "محتوى محمي", value: stats.protectedContent, icon: Lock, color: "text-blue-600" },
          { label: "مستخدمون نشطون", value: stats.activeUsers, icon: Eye, color: "text-green-600" },
          { label: "نسبة الانتهاك", value: stats.violationRate, icon: Shield, color: "text-orange-600" },
        ].map((stat, index) => (
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
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="protection" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="protection">
            <Lock className="w-4 h-4 ml-1" />
            الحماية
          </TabsTrigger>
          <TabsTrigger value="watermark">
            <Droplets className="w-4 h-4 ml-1" />
            العلامة المائية
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="w-4 h-4 ml-1" />
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="w-4 h-4 ml-1" />
            السجل
          </TabsTrigger>
        </TabsList>

        {/* Protection Settings */}
        <TabsContent value="protection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                إعدادات الحماية
              </CardTitle>
              <CardDescription>
                خيارات منع النسخ والطباعة والتحميل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { key: "preventCopy", label: "منع النسخ", description: "تعطيل نسخ النصوص", icon: Copy },
                  { key: "preventPrint", label: "منع الطباعة", description: "تعطيل طباعة الصفحة (Ctrl+P)", icon: Printer },
                  { key: "preventScreenshot", label: "منع لقطة الشاشة", description: "محاولة منع Screenshot", icon: Camera },
                  { key: "preventRightClick", label: "منع النقر بالزر الأيمن", description: "تعطيل قائمة السياق", icon: Settings },
                  { key: "preventDownload", label: "منع التحميل", description: "تعطيل تحميل الملفات", icon: Download },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="font-medium">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, [item.key]: checked }))
                      }
                      disabled={!settings.drmEnabled}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Watermark Settings */}
        <TabsContent value="watermark">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                إعدادات العلامة المائية
              </CardTitle>
              <CardDescription>
                تخصيص العلامة المائية على المحتوى
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تفعيل العلامة المائية</Label>
                  <p className="text-sm text-muted-foreground">
                    إضافة علامة مائية على المحتوى
                  </p>
                </div>
                <Switch
                  checked={settings.watermarkEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, watermarkEnabled: checked }))
                  }
                  disabled={!settings.drmEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">نوع العلامة</Label>
                <Select
                  value={settings.watermarkType}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, watermarkType: value }))
                  }
                  disabled={!settings.watermarkEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص ثابت</SelectItem>
                    <SelectItem value="logo">شعار المنصة</SelectItem>
                    <SelectItem value="user-info">معلومات المستخدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">موقع العلامة</Label>
                <Select
                  value={settings.watermarkPosition}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, watermarkPosition: value }))
                  }
                  disabled={!settings.watermarkEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">وسط الصفحة</SelectItem>
                    <SelectItem value="corner">الزاوية</SelectItem>
                    <SelectItem value="tile">مبلط (متكرر)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">شفافية العلامة</Label>
                  <Badge variant="secondary">{settings.watermarkOpacity}%</Badge>
                </div>
                <Slider
                  value={[settings.watermarkOpacity]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, watermarkOpacity: value }))
                  }
                  min={5}
                  max={50}
                  step={5}
                  disabled={!settings.watermarkEnabled}
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="font-medium">معاينة</Label>
                <div className="relative h-40 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
                  <div
                    className="absolute inset-0 flex flex-wrap items-center justify-center gap-8 pointer-events-none"
                    style={{
                      opacity: settings.watermarkOpacity / 100,
                      transform: "rotate(-30deg) scale(1.2)",
                    }}
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span key={i} className="text-gray-500 text-sm font-bold whitespace-nowrap">
                        {settings.watermarkType === "user-info" 
                          ? "أحمد محمد | ID:12345" 
                          : settings.watermarkType === "logo"
                          ? "🎓 EduSaas"
                          : "محمي بحقوق الملكية"}
                      </span>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">معاينة العلامة المائية</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Types */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                أنواع المحتوى المحمي
              </CardTitle>
              <CardDescription>
                اختر أنواع المحتوى التي تريد حمايتها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "protectVideos", label: "الفيديوهات", description: "حماية مقاطع الفيديو التعليمية", icon: Video, count: 156 },
                { key: "protectDocuments", label: "المستندات", description: "حماية ملفات PDF والمستندات", icon: FileText, count: 342 },
                { key: "protectImages", label: "الصور", description: "حماية الصور والرسومات", icon: ImageIcon, count: 89 },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="font-medium">{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{item.count} ملف</Badge>
                    <Switch
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, [item.key]: checked }))
                      }
                      disabled={!settings.drmEnabled}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                سجل محاولات الوصول
              </CardTitle>
              <CardDescription>
                سجل محاولات النسخ والتحميل غير المصرح بها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>المحتوى</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="text-muted-foreground">{log.content}</TableCell>
                      <TableCell className="text-muted-foreground">{log.time}</TableCell>
                      <TableCell>
                        <Badge variant={log.blocked ? "destructive" : "default"}>
                          {log.blocked ? "محظور" : "مسموح"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning */}
      {!settings.drmEnabled && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                حماية المحتوى معطلة. المحتوى غير محمي حالياً من النسخ والتحميل.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
