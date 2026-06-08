"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, Clock, GraduationCap, Plus, ChevronLeft } from "lucide-react"

// --- API response shape (served by GET /api/institute/programs) ---
interface ProgramRow {
  id: string
  nameAr: string
  nameEn: string
  department: string
  departmentId: string | null
  degree: string
  years: number
  totalCreditHours: number
  description: string
  isActive: boolean
  students: number
}

interface ProgramsResponse {
  programs: ProgramRow[]
  stats: { total: number }
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/programs")
        if (!res.ok) {
          throw new Error("فشل تحميل البيانات")
        }
        const json = (await res.json()) as ProgramsResponse
        if (!cancelled) setPrograms(json.programs ?? [])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            البرامج الأكاديمية
          </h1>
          <p className="text-muted-foreground">إدارة البرامج الدراسية المتاحة</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة برنامج
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
            جارٍ تحميل البرامج...
          </CardContent>
        </Card>
      )}

      {!loading && !error && programs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            لا توجد برامج
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{program.degree || "—"}</Badge>
                  <Badge variant="outline">{program.department || "—"}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{program.nameAr}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{`${program.years} سنوات`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span>{program.totalCreditHours} ساعة</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-institute-blue" />
                    <span className="font-bold text-institute-blue">{program.students}</span>
                    <span className="text-sm text-muted-foreground">طالب</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="w-4 h-4" />
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
