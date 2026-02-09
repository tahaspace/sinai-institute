"use client"

import { useState } from "react"
import {
  BookOpen,
  Plus,
  Video,
  FileText,
  Image,
  Music,
  Folder,
  Upload,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  Search,
  Grid,
  List,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Content Items
const contentItems = [
  { id: 1, title: "شرح التفاضل والتكامل", type: "video", subject: "الرياضيات", size: "250 MB", views: 156, date: "2024-12-24", duration: "45:30" },
  { id: 2, title: "ملخص الباب الثالث", type: "pdf", subject: "الرياضيات", size: "2.5 MB", views: 89, date: "2024-12-23", pages: 15 },
  { id: 3, title: "قوانين نيوتن", type: "video", subject: "الفيزياء", size: "180 MB", views: 124, date: "2024-12-22", duration: "35:20" },
  { id: 4, title: "تمارين محلولة", type: "pdf", subject: "الفيزياء", size: "1.8 MB", views: 95, date: "2024-12-21", pages: 25 },
  { id: 5, title: "شرح التفاعلات الكيميائية", type: "video", subject: "الكيمياء", size: "200 MB", views: 78, date: "2024-12-20", duration: "40:15" },
  { id: 6, title: "صور المعادلات", type: "image", subject: "الكيمياء", size: "5 MB", views: 45, date: "2024-12-19" },
]

// Units/Modules
const units = [
  { id: 1, name: "الباب الأول - المقدمة", items: 8, subject: "الرياضيات" },
  { id: 2, name: "الباب الثاني - التفاضل", items: 12, subject: "الرياضيات" },
  { id: 3, name: "الباب الثالث - التكامل", items: 10, subject: "الرياضيات" },
  { id: 4, name: "الوحدة الأولى - الميكانيكا", items: 15, subject: "الفيزياء" },
]

// Stats
const stats = {
  totalContent: 156,
  videos: 45,
  pdfs: 89,
  images: 22,
  totalViews: 12500,
  storageUsed: "15.2 GB",
  storageTotal: "50 GB",
}

const typeConfig = {
  video: { icon: Video, color: "bg-red-100 text-red-600", label: "فيديو" },
  pdf: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "PDF" },
  image: { icon: Image, color: "bg-green-100 text-green-600", label: "صورة" },
  audio: { icon: Music, color: "bg-purple-100 text-purple-600", label: "صوت" },
}

export default function ContentPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المحتوى التعليمي</h1>
          <p className="text-muted-foreground">إدارة ورفع المحتوى التعليمي</p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="w-4 h-4 ml-2" />
          رفع محتوى
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalContent}</p>
                <p className="text-sm text-muted-foreground">إجمالي المحتوى</p>
              </div>
              <BookOpen className="w-8 h-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.videos}</p>
                <p className="text-sm text-muted-foreground">فيديو</p>
              </div>
              <Video className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.pdfs}</p>
                <p className="text-sm text-muted-foreground">ملف PDF</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">مشاهدة</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">مساحة التخزين المستخدمة</span>
            <span className="font-medium">{stats.storageUsed} / {stats.storageTotal}</span>
          </div>
          <Progress value={30} className="h-2" />
        </CardContent>
      </Card>

      {/* Upload Form */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>رفع محتوى جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان المحتوى</Label>
                <Input placeholder="مثال: شرح الباب الثالث" />
              </div>
              <div className="space-y-2">
                <Label>المادة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">الرياضيات</SelectItem>
                    <SelectItem value="physics">الفيزياء</SelectItem>
                    <SelectItem value="chemistry">الكيمياء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الوحدة</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع المحتوى</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">فيديو</SelectItem>
                    <SelectItem value="pdf">ملف PDF</SelectItem>
                    <SelectItem value="image">صورة</SelectItem>
                    <SelectItem value="audio">ملف صوتي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>الوصف</Label>
                <Textarea placeholder="وصف المحتوى..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>الملف</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-violet-500 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">اسحب الملفات هنا أو اضغط للتحميل</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    يدعم: PDF, MP4, MP3, JPG, PNG (الحد الأقصى: 500 MB)
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Button className="bg-violet-500 hover:bg-violet-600">
                  <Upload className="w-4 h-4 ml-2" />
                  رفع المحتوى
                </Button>
                <Button variant="outline" onClick={() => setShowUpload(false)}>إلغاء</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="videos">فيديو</TabsTrigger>
            <TabsTrigger value="files">ملفات</TabsTrigger>
            <TabsTrigger value="units">الوحدات</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="pr-10 w-64" />
            </div>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* All Content Tab */}
        <TabsContent value="all" className="mt-6">
          {viewMode === "list" ? (
            <div className="space-y-4">
              {contentItems.map((item) => {
                const config = typeConfig[item.type as keyof typeof typeConfig]
                const Icon = config.icon

                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.color)}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.subject} • {item.size} • {item.views} مشاهدة
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{config.label}</Badge>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>تعديل</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contentItems.map((item) => {
                const config = typeConfig[item.type as keyof typeof typeConfig]
                const Icon = config.icon

                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className={cn("w-full h-32 rounded-lg flex items-center justify-center mb-4", config.color)}>
                        <Icon className="w-12 h-12" />
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.views} مشاهدة</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-6">
          <div className="space-y-4">
            {contentItems.filter(i => i.type === "video").map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <Video className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.subject} • {item.duration} • {item.views} مشاهدة
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 ml-2" />
                      مشاهدة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-6">
          <div className="space-y-4">
            {contentItems.filter(i => i.type !== "video").map((item) => {
              const config = typeConfig[item.type as keyof typeof typeConfig]
              const Icon = config.icon

              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.color)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.subject} • {item.size}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">
                        <Download className="w-4 h-4 ml-2" />
                        تحميل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {units.map((unit) => (
              <Card key={unit.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Folder className="w-7 h-7 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-bold">{unit.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {unit.subject} • {unit.items} عنصر
                      </p>
                    </div>
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



