"use client"

import { useState, useEffect } from "react"
import { AcademicSystemFilter, ACADEMIC_SYSTEM_ALL, matchesSystem } from "@/components/shared/academic-system-filter"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Gift, Users, Percent, Award, Plus } from "lucide-react"

interface ScholarshipRow {
  id: string
  student: string
  studentCode: string
  system: string
  type: string
  amount: number
  percentage: number | null
  academicYear: string
  reason: string
  status: "ACTIVE" | "ENDED"
}

interface ScholarshipStats {
  total: number
  active: number
  totalAmount: number
}

export default function ScholarshipsPage() {
  const [allScholarships, setAllScholarships] = useState<ScholarshipRow[]>([])
  const [systemFilter, setSystemFilter] = useState(ACADEMIC_SYSTEM_ALL)
  const [apiStats, setApiStats] = useState<ScholarshipStats>({ total: 0, active: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/institute/finance/scholarships`)
        if (!res.ok) throw new Error("فشل في جلب المنح")
        const json = await res.json()
        if (!cancelled) {
          setAllScholarships(json.scholarships ?? [])
          setApiStats(json.stats ?? { total: 0, active: 0, totalAmount: 0 })
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

  // Both lists on this page are the same student list, so both narrow together — which is why the
  // control sits in the list card's header, not the page header: the stat cards do NOT follow it
  // («قيمة المنح» is the granted total finance books, «إجمالي المنح» counts every grant).
  const scholarships = allScholarships.filter((s) => matchesSystem(s.system, systemFilter))

  // "No grants at all" and "none in the selected system" are different facts, and the cards above
  // stay institute-wide — so a blank list has to say which of the two it is.
  const emptyScholarships = systemFilter === ACADEMIC_SYSTEM_ALL ? "لا توجد منح" : "لا توجد منح ضمن النظام المحدد"
  const emptyBeneficiaries = systemFilter === ACADEMIC_SYSTEM_ALL ? "لا يوجد مستفيدون" : "لا يوجد مستفيدون ضمن النظام المحدد"

  const stats = [
    { label: "المستفيدين", value: String(apiStats.total), icon: Users, color: "text-institute-blue" },
    { label: "المنح النشطة", value: String(apiStats.active), icon: Award, color: "text-institute-gold" },
    { label: "قيمة المنح", value: apiStats.totalAmount.toLocaleString(), icon: Gift, color: "text-institute-gold" },
    { label: "إجمالي المنح", value: String(allScholarships.length), icon: Percent, color: "text-institute-blue" },
  ]

  const recentBeneficiaries = scholarships.slice(0, 5).map((s) => ({
    name: s.student,
    type: s.type,
    amount: s.amount,
  }))

  const statusLabel = (status: ScholarshipRow["status"]) => (status === "ACTIVE" ? "نشط" : "منتهٍ")

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-7 h-7 text-institute-blue" />
            المنح والإعفاءات
          </h1>
          <p className="text-muted-foreground">إدارة برامج المنح والإعفاءات المالية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          منحة جديدة
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-muted-foreground">جارٍ تحميل المنح...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scholarships */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle>المنح والإعفاءات</CardTitle>
                <CardDescription>برامج المنح والإعفاءات المتاحة</CardDescription>
              </div>
              <AcademicSystemFilter value={systemFilter} onChange={setSystemFilter} className="w-full md:w-56" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!loading && scholarships.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">{emptyScholarships}</p>
              )}
              {scholarships.map((scholarship, index) => (
                <motion.div
                  key={scholarship.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <h4 className="font-medium">{scholarship.student}</h4>
                    <p className="text-sm text-muted-foreground">{scholarship.studentCode} · {scholarship.type}</p>
                    <p className="text-sm text-muted-foreground">{scholarship.reason}</p>
                    <p className="text-xs text-muted-foreground">{scholarship.academicYear}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-institute-gold text-purple-700">
                      {scholarship.percentage !== null ? `${scholarship.percentage}%` : "—"}
                    </Badge>
                    <Badge variant="outline">{scholarship.amount.toLocaleString()}</Badge>
                    <Badge variant="secondary">{statusLabel(scholarship.status)}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Beneficiaries */}
        <Card>
          <CardHeader>
            <CardTitle>آخر المستفيدين</CardTitle>
            <CardDescription>الطلاب الحاصلين على منح حديثاً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!loading && recentBeneficiaries.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">{emptyBeneficiaries}</p>
              )}
              {recentBeneficiaries.map((beneficiary, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar>
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {beneficiary.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{beneficiary.name}</h4>
                    <p className="text-sm text-muted-foreground">{beneficiary.type}</p>
                  </div>
                  <div className="text-left">
                    <Badge className="bg-institute-blue text-green-700">{beneficiary.amount.toLocaleString()}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
