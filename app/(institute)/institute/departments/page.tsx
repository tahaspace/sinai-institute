"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Plus,
  ChevronLeft,
  Settings,
  BarChart3,
} from "lucide-react"

// --- API response shape (served by GET /api/departments) ---
interface DepartmentRow {
  id: string
  nameAr: string
  nameEn: string
  description: string | null
  head: string | null
  order: number
  isActive: boolean
  specializations: { id: string; nameAr: string }[]
  _count: { specializations: number }
}

// Presentation-only styling assigned per card position (not data from the API)
const cardGradients = [
  "from-institute-blue to-blue-600",
  "from-institute-gold to-yellow-600",
]
const cardIcons = ["🔧", "💻", "📊", "📈", "✈️", "📺", "🌍", "🤝"]

export default function DepartmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [departments, setDepartments] = useState<DepartmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/departments")
        if (!res.ok) {
          throw new Error("فشل في جلب الأقسام")
        }
        const json = (await res.json()) as DepartmentRow[]
        if (!cancelled) setDepartments(json)
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

  const filteredDepartments = departments.filter((dept) =>
    dept.nameAr.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-institute-blue" />
            الأقسام العلمية
          </h1>
          <p className="text-muted-foreground">
            إدارة الأقسام العلمية والبرامج الأكاديمية
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة قسم جديد
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            جارٍ تحميل الأقسام...
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "الأقسام العلمية", value: departments.length, icon: Building2, color: "text-institute-blue" },
          { label: "إجمالي الطلاب", value: "—", icon: Users, color: "text-institute-blue" },
          { label: "أعضاء هيئة التدريس", value: "—", icon: GraduationCap, color: "text-institute-gold" },
          { label: "المقررات الدراسية", value: "—", icon: BookOpen, color: "text-institute-gold" },
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن قسم..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Departments Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cardGradients[index % cardGradients.length]} flex items-center justify-center text-2xl`}>
                    {cardIcons[index % cardIcons.length]}
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="mt-4">{dept.nameAr}</CardTitle>
                <CardDescription>{dept.description ?? "—"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">—</p>
                    <p className="text-xs text-muted-foreground">طالب</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">—</p>
                    <p className="text-xs text-muted-foreground">عضو</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{dept._count.specializations}</p>
                    <p className="text-xs text-muted-foreground">مقرر</p>
                  </div>
                </div>

                {/* Programs */}
                <div>
                  <p className="text-sm font-medium mb-2">البرامج:</p>
                  <div className="flex flex-wrap gap-1">
                    {dept.specializations.map((program) => (
                      <Badge key={program.id} variant="secondary" className="text-xs">
                        {program.nameAr}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Head */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">رئيس القسم:</span>
                  </div>
                  <span className="text-sm font-medium">{dept.head ?? "—"}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/institute/departments/${dept.id}`}>
                      عرض التفاصيل
                      <ChevronLeft className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
