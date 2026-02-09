"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Search, Plus, Download, FileText, Star, ExternalLink, Quote, Eye, Edit, Trash2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const myPublications = [
  { id: 1, title: "Machine Learning in Education: A Comprehensive Review", journal: "IEEE Transactions on Education", year: 2024, citations: 45, type: "journal", impact: 4.5, status: "published" },
  { id: 2, title: "AI-Powered Learning Systems for Higher Education", journal: "ACM Conference on Learning", year: 2024, citations: 28, type: "conference", impact: 3.1, status: "published" },
  { id: 3, title: "Data Analytics in Higher Education: Challenges and Opportunities", journal: "Springer Education", year: 2023, citations: 32, type: "book_chapter", impact: null, status: "published" },
  { id: 4, title: "Deep Learning for Student Performance Prediction", journal: "Nature Machine Intelligence", year: 2024, citations: 0, type: "journal", impact: 8.2, status: "under_review" },
  { id: 5, title: "Adaptive Learning Algorithms: A Survey", journal: "IEEE Access", year: 2023, citations: 18, type: "journal", impact: 3.9, status: "published" },
]

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

export default function FacultyPublicationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredPubs = myPublications.filter(pub => {
    const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || pub.type === typeFilter
    return matchesSearch && matchesType
  })

  const totalCitations = myPublications.reduce((s, p) => s + p.citations, 0)
  const hIndex = 4 // Calculated H-index
  const publishedCount = myPublications.filter(p => p.status === "published").length

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المنشورات", value: myPublications.length, icon: FileText, color: "indigo" },
          { label: "إجمالي الاستشهادات", value: totalCitations, icon: Quote, color: "purple" },
          { label: "H-Index", value: hIndex, icon: TrendingUp, color: "green" },
          { label: "متوسط Impact Factor", value: "4.8", icon: Star, color: "yellow" },
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
                    <p className="text-sm text-gray-500 mt-1">{pub.journal} • {pub.year}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge className={typeConfig[pub.type as keyof typeof typeConfig].color}>
                        {typeConfig[pub.type as keyof typeof typeConfig].label}
                      </Badge>
                      <Badge className={statusConfig[pub.status as keyof typeof statusConfig].color}>
                        {statusConfig[pub.status as keyof typeof statusConfig].label}
                      </Badge>
                      {pub.impact && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          IF: {pub.impact}
                        </Badge>
                      )}
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
