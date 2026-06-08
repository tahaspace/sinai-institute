"use client"

import { useState, useEffect } from "react"
import {
  Megaphone,
  Plus,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  BarChart3,
  Clock,
  MoreVertical,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Campaign = {
  id: string
  name: string
  type: string | null
  budget: number
  spent: number
  leads: number
  conversions: number
  status: string
  startDate: string
  endDate: string
}

type Stats = {
  total: number
  active: number
  totalBudget: number
  totalSpent: number
  totalLeads: number
}

type MarketingResponse = {
  campaigns: Campaign[]
  stats: Stats
}

const statusConfig = {
  active: { label: "نشط", color: "bg-institute-blue text-green-700" },
  completed: { label: "مكتمل", color: "bg-institute-blue text-blue-700" },
  paused: { label: "متوقف", color: "bg-yellow-100 text-yellow-700" },
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalLeads: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/institute/marketing")
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(b.error || "فشل في جلب البيانات")
        }
        const json: MarketingResponse = await res.json()
        if (!cancelled) {
          setCampaigns(json.campaigns)
          setStats(json.stats)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // معدل التحويل العام: مجموع التحويلات ÷ مجموع العملاء المحتملين
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const conversionRate =
    stats.totalLeads > 0 ? ((totalConversions / stats.totalLeads) * 100).toFixed(1) : "0"

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

      {loading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Megaphone className="w-8 h-8 mx-auto text-institute-blue mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">حملة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-institute-blue">{stats.active}</p>
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
            <p className="text-2xl font-bold text-institute-gold">{conversionRate}%</p>
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
              <div className="py-12 text-center text-muted-foreground">
                لا توجد بيانات عملاء محتملين متاحة حالياً
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
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">زائر</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MousePointer className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">مشاهدة صفحة</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">معدل الارتداد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">—</p>
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



