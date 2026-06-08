"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, FileText, Target, CheckCircle, AlertTriangle, Download } from "lucide-react"

type QualityIndicator = { id: string; name: string; score: number; target: number }
type QualityStats = { achievedPct: number; belowTarget: number; avgScore: number; total: number }
type QualityResponse = { qualityIndicators: QualityIndicator[]; stats: QualityStats }

export default function QualityPage() {
  const [qualityIndicators, setQualityIndicators] = useState<QualityIndicator[]>([])
  const [stats, setStats] = useState<QualityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/quality")
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(b.error || "فشل في جلب البيانات")
        }
        const json: QualityResponse = await res.json()
        if (!cancelled) {
          setQualityIndicators(json.qualityIndicators)
          setStats(json.stats)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const statCards = [
    { label: "المعايير المحققة", value: stats ? `${stats.achievedPct}%` : "—", icon: Target, color: "text-institute-blue" },
    { label: "التقارير المعتمدة", value: "—", icon: FileText, color: "text-institute-blue" },
    { label: "التوصيات المنفذة", value: "—", icon: CheckCircle, color: "text-institute-gold" },
    { label: "نقاط التحسين", value: stats ? String(stats.belowTarget) : "—", icon: AlertTriangle, color: "text-yellow-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-institute-blue" />
            ضمان الجودة
          </h1>
          <p className="text-muted-foreground">متابعة معايير الجودة والاعتماد الأكاديمي</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 ml-2" />
          تقرير الجودة
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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

      {/* Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>مؤشرات الجودة</CardTitle>
          <CardDescription>تقييم الأداء مقارنة بالمستهدف</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {qualityIndicators.map((indicator, index) => {
              const achieved = indicator.score >= indicator.target
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{indicator.name}</span>
                      {achieved ? (
                        <Badge className="bg-institute-blue text-green-700">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          محقق
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <AlertTriangle className="w-3 h-3 ml-1" />
                          يحتاج تحسين
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={achieved ? "text-institute-blue font-bold" : "text-yellow-600 font-bold"}>
                        {indicator.score}%
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{indicator.target}%</span>
                    </div>
                  </div>
                  <Progress 
                    value={indicator.score} 
                    className={`h-2 ${achieved ? "[&>div]:bg-institute-blue" : "[&>div]:bg-yellow-500"}`}
                  />
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
