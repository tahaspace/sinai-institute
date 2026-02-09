"use client"

import { useState } from "react"
import {
  Megaphone,
  Search,
  Plus,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  BarChart3,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

// Campaigns Data
const campaigns = [
  {
    id: "CMP001",
    name: "حملة الشتاء 2024",
    type: "إعلانات رقمية",
    budget: 50000,
    spent: 35000,
    leads: 245,
    conversions: 48,
    status: "active",
    startDate: "2024-12-01",
    endDate: "2025-01-31",
  },
  {
    id: "CMP002",
    name: "برنامج PMP المكثف",
    type: "البريد الإلكتروني",
    budget: 15000,
    spent: 12000,
    leads: 180,
    conversions: 35,
    status: "active",
    startDate: "2024-12-15",
    endDate: "2025-02-15",
  },
  {
    id: "CMP003",
    name: "التسويق عبر السوشيال",
    type: "السوشيال ميديا",
    budget: 30000,
    spent: 30000,
    leads: 420,
    conversions: 62,
    status: "completed",
    startDate: "2024-10-01",
    endDate: "2024-11-30",
  },
]

// Leads Data
const leads = [
  {
    id: "LEAD001",
    name: "أحمد محمد علي",
    phone: "01012345678",
    email: "ahmed@example.com",
    interest: "تطوير الويب",
    source: "إعلان فيسبوك",
    status: "new",
    date: "2024-12-25",
  },
  {
    id: "LEAD002",
    name: "سارة خالد أحمد",
    phone: "01123456789",
    email: "sara@example.com",
    interest: "التسويق الرقمي",
    source: "الموقع الإلكتروني",
    status: "contacted",
    date: "2024-12-24",
  },
  {
    id: "LEAD003",
    name: "محمد سعيد حسن",
    phone: "01234567890",
    email: "mohamed@example.com",
    interest: "إدارة المشاريع",
    source: "تحويل صديق",
    status: "qualified",
    date: "2024-12-23",
  },
]

// Market Analytics
const analytics = {
  visitors: 12500,
  pageViews: 45000,
  bounceRate: 35,
  avgSessionDuration: "3:45",
}

// Stats
const stats = {
  totalCampaigns: campaigns.length,
  activeCampaigns: campaigns.filter(c => c.status === "active").length,
  totalLeads: 845,
  conversionRate: 12.5,
}

const statusConfig = {
  active: { label: "نشط", color: "bg-institute-blue text-green-700" },
  completed: { label: "مكتمل", color: "bg-institute-blue text-blue-700" },
  paused: { label: "متوقف", color: "bg-yellow-100 text-yellow-700" },
}

const leadStatusConfig = {
  new: { label: "جديد", color: "bg-institute-blue text-blue-700" },
  contacted: { label: "تم التواصل", color: "bg-yellow-100 text-yellow-700" },
  qualified: { label: "مؤهل", color: "bg-institute-blue text-green-700" },
  converted: { label: "تحول", color: "bg-institute-gold text-purple-700" },
  lost: { label: "خسارة", color: "bg-red-100 text-red-700" },
}

export default function MarketingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التسويق</h1>
          <p className="text-muted-foreground">إدارة الحملات والعملاء المحتملين</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          حملة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Megaphone className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
            <p className="text-sm text-muted-foreground">حملة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.activeCampaigns}</p>
            <p className="text-sm text-muted-foreground">نشطة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.totalLeads}</p>
            <p className="text-sm text-muted-foreground">عميل محتمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MousePointer className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-institute-gold">{stats.conversionRate}%</p>
            <p className="text-sm text-muted-foreground">معدل التحويل</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="campaigns">الحملات</TabsTrigger>
          <TabsTrigger value="leads">العملاء المحتملين</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status as keyof typeof statusConfig]
              const spentPercentage = (campaign.spent / campaign.budget) * 100
              const conversionRate = ((campaign.conversions / campaign.leads) * 100).toFixed(1)

              return (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{campaign.name}</h3>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.type}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
                          <DropdownMenuItem>تعديل</DropdownMenuItem>
                          {campaign.status === "active" && (
                            <DropdownMenuItem>إيقاف</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-institute-blue">{campaign.leads}</p>
                        <p className="text-xs text-muted-foreground">عميل محتمل</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-institute-blue">{campaign.conversions}</p>
                        <p className="text-xs text-muted-foreground">تحويل</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-institute-blue">{conversionRate}%</p>
                        <p className="text-xs text-muted-foreground">معدل التحويل</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-institute-gold">
                          {campaign.spent.toLocaleString()} ج.م
                        </p>
                        <p className="text-xs text-muted-foreground">المنفق</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>الميزانية المستهلكة</span>
                        <span>{campaign.spent.toLocaleString()} / {campaign.budget.toLocaleString()} ج.م</span>
                      </div>
                      <Progress value={spentPercentage} className="h-2" />
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <span>بدء: {new Date(campaign.startDate).toLocaleDateString("ar-EG")}</span>
                      <span>انتهاء: {new Date(campaign.endDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>العملاء المحتملين</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.map((lead) => {
                  const status = leadStatusConfig[lead.status as keyof typeof leadStatusConfig]

                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-institute-blue text-institute-blue">
                            {lead.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.interest} • {lead.source}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={status.color}>{status.label}</Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Eye className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{analytics.visitors.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">زائر</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MousePointer className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{analytics.pageViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">مشاهدة صفحة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{analytics.bounceRate}%</p>
                <p className="text-sm text-muted-foreground">معدل الارتداد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{analytics.avgSessionDuration}</p>
                <p className="text-sm text-muted-foreground">متوسط الجلسة</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تحليل السوق</CardTitle>
              <CardDescription>نظرة عامة على أداء التسويق</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">الرسوم البيانية</h3>
                <p className="text-muted-foreground">
                  سيتم عرض تحليلات مفصلة هنا
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



