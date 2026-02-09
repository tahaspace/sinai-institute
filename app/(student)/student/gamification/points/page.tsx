"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PointsDisplay, LevelProgress } from "@/components/gamification"
import { Coins, TrendingUp, Calendar, BookOpen, Target, Star, Clock, Gift } from "lucide-react"

// Mock data
const pointsBreakdown = {
  academic: { total: 1500, label: "أكاديمي", icon: BookOpen, color: "text-blue-600" },
  attendance: { total: 400, label: "الحضور", icon: Clock, color: "text-green-600" },
  activities: { total: 300, label: "الأنشطة", icon: Star, color: "text-purple-600" },
  rewards: { total: 200, label: "المكافآت", icon: Gift, color: "text-orange-600" },
}

const recentActivity = [
  { action: "إكمال واجب الرياضيات", points: 50, type: "academic", date: "اليوم 10:30 ص", icon: "📝" },
  { action: "حضور حصة العلوم", points: 10, type: "attendance", date: "اليوم 9:00 ص", icon: "📚" },
  { action: "اختبار اللغة العربية - ممتاز", points: 100, type: "academic", date: "أمس", icon: "🏆" },
  { action: "مساعدة زميل في الفيزياء", points: 30, type: "activities", date: "أمس", icon: "🤝" },
  { action: "إكمال 7 أيام متواصلة", points: 50, type: "rewards", date: "منذ يومين", icon: "🔥" },
  { action: "قراءة درس إضافي", points: 20, type: "academic", date: "منذ يومين", icon: "📖" },
  { action: "المشاركة في المنتدى", points: 15, type: "activities", date: "منذ 3 أيام", icon: "💬" },
  { action: "اختبار قصير - جيد جداً", points: 75, type: "academic", date: "منذ 3 أيام", icon: "✅" },
]

const pointsRules = [
  { category: "الدروس", rules: [
    { action: "إكمال درس", points: 20 },
    { action: "مراجعة درس", points: 10 },
    { action: "قراءة مادة إضافية", points: 15 },
  ]},
  { category: "الواجبات", rules: [
    { action: "تسليم واجب في الوقت", points: 50 },
    { action: "تسليم واجب متأخر", points: 25 },
    { action: "درجة كاملة", points: "+20 إضافية" },
  ]},
  { category: "الاختبارات", rules: [
    { action: "درجة ممتاز (90%+)", points: 100 },
    { action: "درجة جيد جداً (80-89%)", points: 75 },
    { action: "درجة جيد (70-79%)", points: 50 },
  ]},
  { category: "الحضور", rules: [
    { action: "حضور حصة", points: 10 },
    { action: "أسبوع كامل", points: "+50 مكافأة" },
    { action: "شهر كامل", points: "+200 مكافأة" },
  ]},
]

export default function PointsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">نقاطي</h1>
        <p className="text-muted-foreground">تتبع نقاطك وكيفية اكتسابها</p>
      </div>

      {/* Points Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PointsDisplay
          totalPoints={2400}
          weeklyPoints={340}
          monthlyPoints={1200}
          streak={7}
          className="lg:col-span-2"
        />
        <LevelProgress currentLevel={6} currentXP={2400} requiredXP={3000} />
      </div>

      {/* Points Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            توزيع النقاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(pointsBreakdown).map(([key, data]) => (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-xl bg-muted/50 text-center"
              >
                <div className={`w-12 h-12 mx-auto rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-2 ${data.color}`}>
                  <data.icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold">{data.total.toLocaleString("ar-EG")}</p>
                <p className="text-sm text-muted-foreground">{data.label}</p>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${(data.total / 2400) * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">سجل النقاط</TabsTrigger>
          <TabsTrigger value="rules">قواعد الاكتساب</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                آخر النشاطات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium">{item.action}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.date}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.type === "academic" && "أكاديمي"}
                            {item.type === "attendance" && "حضور"}
                            {item.type === "activities" && "نشاط"}
                            {item.type === "rewards" && "مكافأة"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                      <Coins className="w-4 h-4" />
                      <span>+{item.points}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pointsRules.map((category, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.rules.map((rule, ruleIndex) => (
                      <div
                        key={ruleIndex}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm">{rule.action}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {rule.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
