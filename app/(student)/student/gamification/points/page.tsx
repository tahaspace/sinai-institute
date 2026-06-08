"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PointsDisplay, LevelProgress } from "@/components/gamification"
import { Coins, TrendingUp, Calendar, BookOpen, Star, Clock, Gift } from "lucide-react"

interface PointsBreakdownItem {
  category: string
  label: string
  points: number
}

interface RecentActivityItem {
  id: string
  reason: string
  points: number
  category: string
  date: string
}

interface PointsRule {
  action: string
  points: string
}

const categoryMeta: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  academic: { icon: BookOpen, color: "text-blue-600", label: "أكاديمي" },
  attendance: { icon: Clock, color: "text-green-600", label: "حضور" },
  activities: { icon: Star, color: "text-purple-600", label: "نشاط" },
  rewards: { icon: Gift, color: "text-orange-600", label: "مكافأة" },
}

export default function PointsPage() {
  const [total, setTotal] = useState(0)
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdownItem[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [pointsRules, setPointsRules] = useState<PointsRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/student/gamification/points`)
        if (!res.ok) throw new Error("فشل في جلب النقاط")
        const json = await res.json()
        if (!cancelled) {
          setTotal(json.total ?? 0)
          setPointsBreakdown(json.pointsBreakdown ?? [])
          setRecentActivity(json.recentActivity ?? [])
          setPointsRules(json.pointsRules ?? [])
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">نقاطي</h1>
        <p className="text-muted-foreground">تتبع نقاطك وكيفية اكتسابها</p>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل النقاط...</CardContent></Card>}

      {/* Points Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PointsDisplay
          totalPoints={total}
          weeklyPoints={340}
          monthlyPoints={1200}
          streak={7}
          className="lg:col-span-2"
        />
        <LevelProgress currentLevel={6} currentXP={total} requiredXP={3000} />
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
            {pointsBreakdown.map((item) => {
              const meta = categoryMeta[item.category] ?? { icon: Star, color: "text-gray-600", label: item.label }
              const Icon = meta.icon
              return (
                <motion.div
                  key={item.category}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 rounded-xl bg-muted/50 text-center"
                >
                  <div className={`w-12 h-12 mx-auto rounded-full bg-white dark:bg-gray-800 flex items-center justify-center mb-2 ${meta.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-2xl font-bold">{item.points.toLocaleString("ar-EG")}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${total > 0 ? (item.points / total) * 100 : 0}%` }}
                    />
                  </div>
                </motion.div>
              )
            })}
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
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{item.reason}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.date}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {categoryMeta[item.category]?.label ?? item.category}
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">قواعد الاكتساب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pointsRules.map((rule, ruleIndex) => (
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
