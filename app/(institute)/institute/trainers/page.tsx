"use client"

import { useState } from "react"
import Link from "next/link"
import {
  UserCheck,
  Search,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Star,
  BookOpen,
  Clock,
  Phone,
  Mail,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Trainers Data
const trainers = [
  {
    id: "TRN001",
    name: "م. أحمد سعيد محمد",
    specialty: "تطوير الويب",
    phone: "01012345678",
    email: "ahmed@example.com",
    courses: 5,
    trainees: 150,
    rating: 4.9,
    status: "active",
    experience: "8 سنوات",
    certifications: ["AWS Certified", "Google Cloud"],
  },
  {
    id: "TRN002",
    name: "د. سارة محمود حسن",
    specialty: "إدارة المشاريع",
    phone: "01123456789",
    email: "sara@example.com",
    courses: 8,
    trainees: 220,
    rating: 4.8,
    status: "active",
    experience: "12 سنة",
    certifications: ["PMP", "PRINCE2"],
  },
  {
    id: "TRN003",
    name: "أ. محمد خالد علي",
    specialty: "التسويق الرقمي",
    phone: "01234567890",
    email: "mohamed@example.com",
    courses: 6,
    trainees: 180,
    rating: 4.7,
    status: "active",
    experience: "6 سنوات",
    certifications: ["Google Ads", "Facebook Blueprint"],
  },
  {
    id: "TRN004",
    name: "م. فاطمة أحمد سعيد",
    specialty: "تحليل البيانات",
    phone: "01098765432",
    email: "fatma@example.com",
    courses: 3,
    trainees: 85,
    rating: 4.6,
    status: "inactive",
    experience: "4 سنوات",
    certifications: ["Python", "Data Science"],
  },
]

// Schedule Data
const scheduleData = [
  { trainer: "م. أحمد سعيد", day: "السبت", time: "6:00 - 9:00 م", course: "تطوير الويب" },
  { trainer: "م. أحمد سعيد", day: "الاثنين", time: "6:00 - 9:00 م", course: "تطوير الويب" },
  { trainer: "د. سارة محمود", day: "الأحد", time: "6:00 - 9:00 م", course: "إدارة المشاريع" },
  { trainer: "أ. محمد خالد", day: "الثلاثاء", time: "6:00 - 9:00 م", course: "التسويق الرقمي" },
]

// Stats
const stats = {
  total: 45,
  active: 38,
  avgRating: 4.7,
  totalCourses: 85,
}

export default function TrainersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState("all")

  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch = trainer.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpecialty = specialtyFilter === "all" || trainer.specialty === specialtyFilter
    return matchesSearch && matchesSpecialty
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المدربين</h1>
          <p className="text-muted-foreground">إدارة فريق المدربين وجداولهم</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button>
            <Plus className="w-4 h-4 ml-2" />
            مدرب جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">مدرب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.active}</p>
            <p className="text-sm text-muted-foreground">نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
            <p className="text-sm text-muted-foreground">متوسط التقييم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.totalCourses}</p>
            <p className="text-sm text-muted-foreground">دورة منعقدة</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trainers">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="trainers">المدربين</TabsTrigger>
          <TabsTrigger value="schedule">الجداول</TabsTrigger>
          <TabsTrigger value="evaluations">التقييمات</TabsTrigger>
        </TabsList>

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التخصصات</SelectItem>
                    <SelectItem value="تطوير الويب">تطوير الويب</SelectItem>
                    <SelectItem value="إدارة المشاريع">إدارة المشاريع</SelectItem>
                    <SelectItem value="التسويق الرقمي">التسويق الرقمي</SelectItem>
                    <SelectItem value="تحليل البيانات">تحليل البيانات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Trainers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-xl bg-institute-blue text-institute-blue">
                        {trainer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{trainer.name}</h3>
                          <p className="text-sm text-muted-foreground">{trainer.specialty}</p>
                        </div>
                        <Badge
                          className={cn(
                            trainer.status === "active"
                              ? "bg-institute-blue text-green-700"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {trainer.status === "active" ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{trainer.rating}</span>
                        <span className="text-sm text-muted-foreground">• {trainer.experience}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{trainer.courses}</p>
                      <p className="text-xs text-muted-foreground">دورة</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-institute-blue">{trainer.trainees}</p>
                      <p className="text-xs text-muted-foreground">متدرب</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-4">
                    {trainer.certifications.map((cert, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/institute/trainers/${trainer.id}`}>
                        <Eye className="w-4 h-4 ml-2" />
                        الملف
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>جداول التدريب</CardTitle>
              <CardDescription>جداول المدربين الأسبوعية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduleData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-institute-blue flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-institute-blue" />
                      </div>
                      <div>
                        <p className="font-medium">{item.trainer}</p>
                        <p className="text-sm text-muted-foreground">{item.course}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{item.day}</p>
                      <p className="text-sm text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>تقييمات المدربين</CardTitle>
              <CardDescription>تقييمات المتدربين للمدربين</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainers.filter(t => t.status === "active").map((trainer) => (
                  <div
                    key={trainer.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-institute-blue text-institute-blue">
                          {trainer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{trainer.name}</p>
                        <p className="text-sm text-muted-foreground">{trainer.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-4 h-4",
                              star <= Math.round(trainer.rating)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-bold">{trainer.rating}</span>
                    </div>
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



