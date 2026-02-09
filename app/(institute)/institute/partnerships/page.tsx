"use client"

import { useState } from "react"
import {
  Handshake,
  Search,
  Plus,
  Building2,
  Users,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  Globe,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

// Partners Data
const partners = [
  {
    id: "PTR001",
    name: "شركة تقنية المستقبل",
    type: "شركة تقنية",
    contact: "أحمد محمد",
    phone: "01012345678",
    email: "ahmed@futuretech.com",
    website: "www.futuretech.com",
    trainees: 45,
    programs: 3,
    status: "active",
    since: "2023-01-15",
  },
  {
    id: "PTR002",
    name: "بنك مصر",
    type: "قطاع مصرفي",
    contact: "سارة خالد",
    phone: "01123456789",
    email: "sara@banquemisr.com",
    website: "www.banquemisr.com",
    trainees: 120,
    programs: 5,
    status: "active",
    since: "2022-06-01",
  },
  {
    id: "PTR003",
    name: "مجموعة العربي",
    type: "صناعة",
    contact: "محمد سعيد",
    phone: "01234567890",
    email: "mohamed@elaraby.com",
    website: "www.elaraby.com",
    trainees: 80,
    programs: 2,
    status: "active",
    since: "2023-09-01",
  },
]

// Job Opportunities
const jobOpportunities = [
  {
    id: 1,
    title: "مطور ويب Junior",
    company: "شركة تقنية المستقبل",
    location: "القاهرة",
    type: "دوام كامل",
    salary: "8,000 - 12,000 ج.م",
    posted: "2024-12-20",
  },
  {
    id: 2,
    title: "محلل بيانات",
    company: "بنك مصر",
    location: "القاهرة",
    type: "دوام كامل",
    salary: "15,000 - 20,000 ج.م",
    posted: "2024-12-18",
  },
  {
    id: 3,
    title: "أخصائي تسويق رقمي",
    company: "مجموعة العربي",
    location: "المنصورة",
    type: "دوام كامل",
    salary: "10,000 - 15,000 ج.م",
    posted: "2024-12-15",
  },
]

// Custom Programs
const customPrograms = [
  { id: 1, partner: "بنك مصر", program: "تحليل البيانات المصرفية", trainees: 30, status: "active" },
  { id: 2, partner: "شركة تقنية المستقبل", program: "تطوير تطبيقات React", trainees: 20, status: "active" },
]

// Stats
const stats = {
  totalPartners: partners.length,
  activePartners: partners.filter(p => p.status === "active").length,
  jobOpportunities: jobOpportunities.length,
  placedTrainees: 245,
}

export default function PartnershipsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || partner.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الشراكات</h1>
          <p className="text-muted-foreground">إدارة الشركاء وفرص التوظيف</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          شريك جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Handshake className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.totalPartners}</p>
            <p className="text-sm text-muted-foreground">شريك</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.activePartners}</p>
            <p className="text-sm text-muted-foreground">نشط</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.jobOpportunities}</p>
            <p className="text-sm text-muted-foreground">فرصة عمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-institute-gold">{stats.placedTrainees}</p>
            <p className="text-sm text-muted-foreground">تم توظيفهم</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="partners">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="partners">الشركاء</TabsTrigger>
          <TabsTrigger value="jobs">فرص العمل</TabsTrigger>
          <TabsTrigger value="custom">برامج مخصصة</TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن شريك..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="نوع الشركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="شركة تقنية">شركة تقنية</SelectItem>
                    <SelectItem value="قطاع مصرفي">قطاع مصرفي</SelectItem>
                    <SelectItem value="صناعة">صناعة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners.map((partner) => (
              <Card key={partner.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-institute-blue flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-institute-blue" />
                      </div>
                      <div>
                        <h3 className="font-bold">{partner.name}</h3>
                        <Badge variant="outline">{partner.type}</Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 ml-2" />
                          عرض
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>المسؤول: {partner.contact}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">{partner.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="font-bold text-institute-blue">{partner.trainees}</p>
                      <p className="text-xs text-muted-foreground">متدرب</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-institute-blue">{partner.programs}</p>
                      <p className="text-xs text-muted-foreground">برنامج</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    شريك منذ {new Date(partner.since).toLocaleDateString("ar-EG")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>فرص العمل المتاحة</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة فرصة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobOpportunities.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <h4 className="font-medium">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.company} • {job.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="font-medium text-institute-blue">{job.salary}</p>
                        <p className="text-xs text-muted-foreground">{job.type}</p>
                      </div>
                      <Button size="sm">تقديم</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Programs Tab */}
        <TabsContent value="custom" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>البرامج المخصصة</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  برنامج جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customPrograms.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-institute-blue flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-institute-blue" />
                      </div>
                      <div>
                        <h4 className="font-medium">{program.program}</h4>
                        <p className="text-sm text-muted-foreground">{program.partner}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-bold">{program.trainees}</p>
                        <p className="text-xs text-muted-foreground">متدرب</p>
                      </div>
                      <Badge className="bg-institute-blue text-green-700">نشط</Badge>
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



