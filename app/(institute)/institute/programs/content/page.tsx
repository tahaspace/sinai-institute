"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, Search, Plus, Download, Upload, Video, File, Image, Folder, Eye, Edit, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const contentData = [
  { id: "CNT001", title: "مقدمة في البرمجة", type: "video", program: "تطوير البرمجيات", size: "250 MB", duration: "45 دقيقة", views: 450, date: "2025-01-10" },
  { id: "CNT002", title: "ملخص الوحدة الأولى", type: "pdf", program: "تطوير البرمجيات", size: "5 MB", duration: null, views: 320, date: "2025-01-08" },
  { id: "CNT003", title: "تمارين عملية", type: "file", program: "تصميم الجرافيك", size: "15 MB", duration: null, views: 180, date: "2025-01-05" },
  { id: "CNT004", title: "شرح أدوات التصميم", type: "video", program: "تصميم الجرافيك", size: "320 MB", duration: "60 دقيقة", views: 280, date: "2025-01-12" },
]

const typeIcons = {
  video: Video,
  pdf: FileText,
  file: File,
  image: Image,
}

const typeColors = {
  video: "bg-red-100 text-red-700",
  pdf: "bg-institute-blue text-blue-700",
  file: "bg-institute-blue text-green-700",
  image: "bg-institute-gold text-purple-700",
}

export default function ContentPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const totalSize = "1.2 GB"
  const totalViews = contentData.reduce((s, c) => s + c.views, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Folder className="w-8 h-8 text-institute-blue" />
            المحتوى التعليمي
          </h1>
          <p className="text-gray-500 mt-1">إدارة المواد التدريبية والفيديوهات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="w-4 h-4 ml-2" />تصدير</Button>
          <Button className="bg-institute-blue hover:bg-institute-blue"><Upload className="w-4 h-4 ml-2" />رفع محتوى</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المحتوى", value: contentData.length, icon: Folder, color: "teal" },
          { label: "الفيديوهات", value: contentData.filter(c => c.type === "video").length, icon: Video, color: "red" },
          { label: "الملفات", value: contentData.filter(c => c.type !== "video").length, icon: FileText, color: "blue" },
          { label: "المشاهدات", value: totalViews, icon: Eye, color: "purple" },
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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="بحث في المحتوى..." className="pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-48"><SelectValue placeholder="البرنامج" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البرامج</SelectItem>
                <SelectItem value="software">تطوير البرمجيات</SelectItem>
                <SelectItem value="design">تصميم الجرافيك</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="video">فيديو</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="file">ملف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>قائمة المحتوى</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-right">البرنامج</TableHead>
                <TableHead className="text-center">الحجم</TableHead>
                <TableHead className="text-center">المدة</TableHead>
                <TableHead className="text-center">المشاهدات</TableHead>
                <TableHead className="text-center">التاريخ</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentData.map((content) => {
                const TypeIcon = typeIcons[content.type as keyof typeof typeIcons]
                return (
                  <TableRow key={content.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[content.type as keyof typeof typeColors]}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{content.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={typeColors[content.type as keyof typeof typeColors]}>
                        {content.type === "video" ? "فيديو" : content.type === "pdf" ? "PDF" : "ملف"}
                      </Badge>
                    </TableCell>
                    <TableCell>{content.program}</TableCell>
                    <TableCell className="text-center">{content.size}</TableCell>
                    <TableCell className="text-center">{content.duration || "-"}</TableCell>
                    <TableCell className="text-center">{content.views}</TableCell>
                    <TableCell className="text-center">{content.date}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost"><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
