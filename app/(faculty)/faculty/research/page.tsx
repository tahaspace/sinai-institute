"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FlaskConical, Plus, BookOpen, Users, TrendingUp, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Publication {
  id: string
  title: string
  venue: string
  year: number | null
  type: "journal" | "conference" | "book"
  citations: number
  impactFactor: number | null
  status: "published" | "under-review"
}

interface ResearchProject {
  id: string
  title: string
  status: string
  progress: number
  team: number
  funding: string
}

interface ResearchStats {
  total: number
  published: number
  underReview: number
  totalCitations: number
  journal: number
  conference: number
  book: number
}

export default function FacultyResearchPage() {
  const [publications, setPublications] = useState<Publication[]>([])
  const [researchProjects, setResearchProjects] = useState<ResearchProject[]>([])
  const [apiStats, setApiStats] = useState<ResearchStats>({
    total: 0,
    published: 0,
    underReview: 0,
    totalCitations: 0,
    journal: 0,
    conference: 0,
    book: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/faculty/research`)
        if (!res.ok) throw new Error("فشل في جلب الأبحاث")
        const json = await res.json()
        if (!cancelled) {
          setPublications(json.publications ?? [])
          setResearchProjects(json.researchProjects ?? [])
          setApiStats(
            json.stats ?? {
              total: 0,
              published: 0,
              underReview: 0,
              totalCitations: 0,
              journal: 0,
              conference: 0,
              book: 0,
            }
          )
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-indigo-600" />
            البحث العلمي
          </h1>
          <p className="text-gray-500 mt-1">إدارة المشاريع البحثية والمنشورات</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          مشروع جديد
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-gray-500">جارٍ تحميل الأبحاث...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "المشاريع البحثية", value: String(researchProjects.length), icon: FlaskConical, color: "indigo" },
          { label: "المنشورات", value: String(apiStats.total), icon: BookOpen, color: "purple" },
          { label: "الاستشهادات", value: String(apiStats.totalCitations), icon: TrendingUp, color: "green" },
          { label: "طلاب تحت الإشراف", value: "—", icon: Users, color: "blue" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">المشاريع البحثية</TabsTrigger>
          <TabsTrigger value="publications">المنشورات</TabsTrigger>
          <TabsTrigger value="supervision">الإشراف</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-4">
          {!loading && researchProjects.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد مشاريع بحثية مسجلة</p>
              </CardContent>
            </Card>
          )}
          {researchProjects.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{project.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={project.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {project.status === "active" ? "نشط" : "مكتمل"}
                        </Badge>
                        <span className="text-sm text-gray-500">التمويل: {project.funding}</span>
                        <span className="text-sm text-gray-500">الفريق: {project.team} باحثين</span>
                      </div>
                    </div>
                    <Button variant="outline">عرض التفاصيل</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{project.progress}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="publications" className="mt-4 space-y-4">
          {!loading && publications.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>لا توجد منشورات مسجلة</p>
              </CardContent>
            </Card>
          )}
          {publications.map((pub) => (
            <Card key={pub.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{pub.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">{pub.venue}</Badge>
                      <Badge variant="outline">
                        {pub.type === "journal" ? "دورية" : pub.type === "conference" ? "مؤتمر" : "كتاب"}
                      </Badge>
                      <Badge className={pub.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                        {pub.status === "published" ? "منشور" : "قيد المراجعة"}
                      </Badge>
                      <span className="text-sm text-gray-500">{pub.year ?? "—"}</span>
                      <span className="text-sm text-gray-500">{pub.citations} استشهاد</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="supervision" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>قائمة طلاب الدراسات العليا تحت الإشراف</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
