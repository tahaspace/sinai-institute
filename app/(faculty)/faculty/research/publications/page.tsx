"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BookOpen, Search, Plus, Download, FileText, Star, ExternalLink, Quote, Edit, Trash2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PublicationRow {
  id: string
  title: string
  journal: string
  year: number | null
  citations: number
  type: string
  impact: number | null
  status: string
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

const typeConfig = {
  journal: { label: "مجلة علمية", color: "bg-blue-100 text-blue-700" },
  conference: { label: "مؤتمر", color: "bg-green-100 text-green-700" },
  book_chapter: { label: "فصل كتاب", color: "bg-purple-100 text-purple-700" },
}

const statusConfig = {
  published: { label: "منشور", color: "bg-green-100 text-green-700" },
  under_review: { label: "تحت المراجعة", color: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "مقبول", color: "bg-blue-100 text-blue-700" },
}

// API type/status values differ from the existing config keys; normalize to the
// closest existing key so the badges keep working without changing the maps.
function normalizeType(apiType: string): string {
  if (apiType === "book") return "book_chapter"
  return apiType
}

function normalizeStatus(apiStatus: string): string {
  if (apiStatus === "under-review") return "under_review"
  return apiStatus
}

export default function FacultyPublicationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [myPublications, setMyPublications] = useState<PublicationRow[]>([])
  const [apiStats, setApiStats] = useState<ResearchStats>({ total: 0, published: 0, underReview: 0, totalCitations: 0, journal: 0, conference: 0, book: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/faculty/research`)
        if (!res.ok) throw new Error("فشل في جلب المنشورات")
        const json = await res.json()
        if (!cancelled) {
          const pubs: PublicationRow[] = (json.publications ?? []).map((p: {
            id: string; title: string; venue: string; year: number | null;
            type: string; citations: number; impactFactor: number | null; status: string
          }) => ({
            id: p.id,
            title: p.title,
            journal: p.venue,
            year: p.year,
            citations: p.citations,
            type: normalizeType(p.type),
            impact: p.impactFactor,
            status: normalizeStatus(p.status),
          }))
          setMyPublications(pubs)
          setApiStats(json.stats ?? { total: 0, published: 0, underReview: 0, totalCitations: 0, journal: 0, conference: 0, book: 0 })
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

  const filteredPubs = myPublications.filter(pub => {
    const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || pub.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalCitations = apiStats.totalCitations
  const avgImpact = (() => {
    const withImpact = myPublications.filter(p => p.impact != null) as (PublicationRow & { impact: number })[]
    if (withImpact.length === 0) return "—"
    return (withImpact.reduce((s, p) => s + p.impact, 0) / withImpact.length).toFixed(1)
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            منشوراتي العلمية
          </h1>
          <p className="text-gray-500 mt-1">إدارة الأبحاث والمنشورات العلمية</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          إضافة منشور
        </Button>
      </div>

      {error && <Card><CardContent className="p-6 text-center text-red-600">{error}</CardContent></Card>}
      {loading && <Card><CardContent className="p-12 text-center text-gray-500">جارٍ تحميل المنشورات...</CardContent></Card>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المنشورات", value: apiStats.total, icon: FileText, color: "indigo" },
          { label: "إجمالي الاستشهادات", value: totalCitations, icon: Quote, color: "purple" },
          { label: "منشورة", value: apiStats.published, icon: TrendingUp, color: "green" },
          { label: "متوسط Impact Factor", value: avgImpact, icon: Star, color: "yellow" },
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="بحث في المنشورات..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="journal">مجلة علمية</SelectItem>
                <SelectItem value="conference">مؤتمر</SelectItem>
                <SelectItem value="book_chapter">فصل كتاب</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-32"><SelectValue placeholder="السنة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><Download className="w-4 h-4 ml-2" />تصدير CV</Button>
          </div>
        </CardContent>
      </Card>

      {/* Publications List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المنشورات ({filteredPubs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPubs.map((pub, i) => (
              <motion.div
                key={pub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{pub.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{pub.journal} • {pub.year ?? "—"}</p>
                    <div className="flex items-center gap-3 mt-3">
                      {pub.type in typeConfig ? (
                        <Badge className={typeConfig[pub.type as keyof typeof typeConfig].color}>
                          {typeConfig[pub.type as keyof typeof typeConfig].label}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">{pub.type}</Badge>
                      )}
                      {pub.status in statusConfig ? (
                        <Badge className={statusConfig[pub.status as keyof typeof statusConfig].color}>
                          {statusConfig[pub.status as keyof typeof statusConfig].label}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">{pub.status}</Badge>
                      )}
                      <Badge className="bg-yellow-100 text-yellow-700">
                        IF: {pub.impact != null ? pub.impact : "—"}
                      </Badge>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Quote className="w-4 h-4" />
                        {pub.citations} استشهاد
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
