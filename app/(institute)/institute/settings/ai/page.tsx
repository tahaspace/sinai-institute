"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Brain,
  MessageCircle,
  TrendingUp,
  Lightbulb,
  Save,
  RotateCcw,
  AlertTriangle,
  Briefcase,
  Target,
  Award,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"

export default function InstituteAISettingsPage() {
  const [settings, setSettings] = useState({
    // General
    aiEnabled: true,
    
    // Career Assistant
    careerAssistantEnabled: true,
    jobMatching: true,
    skillGapAnalysis: true,
    
    // Learning Path
    learningPathEnabled: true,
    personalizedCourses: true,
    certificationGuide: true,
    
    // Performance
    performanceEnabled: true,
    completionPrediction: true,
    engagementTracking: true,
    alertThreshold: 65,
  })

  const handleSave = () => {
    toast.success("تم حفظ إعدادات الذكاء الاصطناعي")
  }

  const handleReset = () => {
    toast.info("تم إعادة تعيين الإعدادات")
  }

  const stats = {
    careerMatches: 890,
    learningPaths: 1250,
    predictions: 567,
    certifications: 340,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-institute-blue" />
            إعدادات الذكاء الاصطناعي - المعهد
          </h1>
          <p className="text-muted-foreground">
            تخصيص أدوات AI للتدريب والتطوير المهني
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 ml-2" />
            إعادة تعيين
          </Button>
          <Button onClick={handleSave} className="bg-institute-blue hover:bg-institute-blue">
            <Save className="w-4 h-4 ml-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Master Toggle */}
      <Card className={settings.aiEnabled ? "border-institute-blue/50" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-institute-blue to-blue-600 flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">تفعيل الذكاء الاصطناعي للتدريب</h3>
                <p className="text-sm text-muted-foreground">
                  أدوات AI متخصصة للتدريب والتأهيل المهني
                </p>
              </div>
            </div>
            <Switch
              checked={settings.aiEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, aiEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "مطابقة وظيفية", value: stats.careerMatches, icon: Briefcase, color: "text-institute-blue" },
          { label: "مسارات تعلم", value: stats.learningPaths, icon: Target, color: "text-institute-blue" },
          { label: "توقعات إتمام", value: stats.predictions, icon: TrendingUp, color: "text-institute-gold" },
          { label: "شهادات مقترحة", value: stats.certifications, icon: Award, color: "text-institute-blue" },
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
                  <p className="text-2xl font-bold">{stat.value.toLocaleString("ar-EG")}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="career" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="career">
            <Briefcase className="w-4 h-4 ml-1" />
            التوظيف
          </TabsTrigger>
          <TabsTrigger value="learning">
            <BookOpen className="w-4 h-4 ml-1" />
            التعلم
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="w-4 h-4 ml-1" />
            الأداء
          </TabsTrigger>
        </TabsList>

        {/* Career Assistant */}
        <TabsContent value="career">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                مساعد التوظيف الذكي
              </CardTitle>
              <CardDescription>
                مطابقة المتدربين مع فرص العمل المناسبة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تفعيل مساعد التوظيف</Label>
                  <p className="text-sm text-muted-foreground">
                    تحليل مهارات المتدربين ومطابقتها مع الوظائف
                  </p>
                </div>
                <Switch
                  checked={settings.careerAssistantEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, careerAssistantEnabled: checked }))
                  }
                  disabled={!settings.aiEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">مطابقة الوظائف</Label>
                  <p className="text-sm text-muted-foreground">
                    اقتراح وظائف تناسب مهارات المتدرب
                  </p>
                </div>
                <Switch
                  checked={settings.jobMatching}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, jobMatching: checked }))
                  }
                  disabled={!settings.careerAssistantEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تحليل فجوة المهارات</Label>
                  <p className="text-sm text-muted-foreground">
                    تحديد المهارات المطلوبة للوظائف المستهدفة
                  </p>
                </div>
                <Switch
                  checked={settings.skillGapAnalysis}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, skillGapAnalysis: checked }))
                  }
                  disabled={!settings.careerAssistantEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Path */}
        <TabsContent value="learning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                مسارات التعلم الذكية
              </CardTitle>
              <CardDescription>
                تخصيص مسارات تدريبية لكل متدرب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تفعيل مسارات التعلم</Label>
                  <p className="text-sm text-muted-foreground">
                    إنشاء مسارات تعلم مخصصة
                  </p>
                </div>
                <Switch
                  checked={settings.learningPathEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, learningPathEnabled: checked }))
                  }
                  disabled={!settings.aiEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">دورات مخصصة</Label>
                  <p className="text-sm text-muted-foreground">
                    اقتراح دورات بناءً على الأهداف المهنية
                  </p>
                </div>
                <Switch
                  checked={settings.personalizedCourses}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, personalizedCourses: checked }))
                  }
                  disabled={!settings.learningPathEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">دليل الشهادات</Label>
                  <p className="text-sm text-muted-foreground">
                    توصية بالشهادات المهنية المناسبة
                  </p>
                </div>
                <Switch
                  checked={settings.certificationGuide}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, certificationGuide: checked }))
                  }
                  disabled={!settings.learningPathEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                تحليلات الأداء
              </CardTitle>
              <CardDescription>
                متابعة وتوقع أداء المتدربين
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تفعيل تحليلات الأداء</Label>
                </div>
                <Switch
                  checked={settings.performanceEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, performanceEnabled: checked }))
                  }
                  disabled={!settings.aiEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">توقع الإتمام</Label>
                  <p className="text-sm text-muted-foreground">
                    توقع احتمالية إتمام الدورات التدريبية
                  </p>
                </div>
                <Switch
                  checked={settings.completionPrediction}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, completionPrediction: checked }))
                  }
                  disabled={!settings.performanceEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">تتبع التفاعل</Label>
                  <p className="text-sm text-muted-foreground">
                    قياس مستوى تفاعل المتدربين
                  </p>
                </div>
                <Switch
                  checked={settings.engagementTracking}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, engagementTracking: checked }))
                  }
                  disabled={!settings.performanceEnabled}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">عتبة التنبيه</Label>
                  <Badge variant="secondary">{settings.alertThreshold}%</Badge>
                </div>
                <Slider
                  value={[settings.alertThreshold]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, alertThreshold: value }))
                  }
                  min={50}
                  max={80}
                  step={5}
                  disabled={!settings.performanceEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning */}
      {!settings.aiEnabled && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                جميع ميزات الذكاء الاصطناعي للمعهد معطلة حالياً.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
