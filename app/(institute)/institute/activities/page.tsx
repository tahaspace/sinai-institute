"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Award, Users, Calendar, Trophy, Plus, ChevronLeft } from "lucide-react"

export default function ActivitiesPage() {
  const stats = [
    { label: "الأنشطة النشطة", value: "24", icon: Award, color: "text-institute-blue" },
    { label: "المشاركين", value: "850", icon: Users, color: "text-institute-blue" },
    { label: "فعاليات هذا الشهر", value: "8", icon: Calendar, color: "text-institute-gold" },
    { label: "الإنجازات", value: "45", icon: Trophy, color: "text-institute-gold" },
  ]

  const activities = [
    { name: "نادي البرمجة", members: 120, type: "أكاديمي", nextEvent: "مسابقة البرمجة", date: "2025-01-15" },
    { name: "فريق كرة القدم", members: 25, type: "رياضي", nextEvent: "مباراة ودية", date: "2025-01-10" },
    { name: "جماعة الإعلام", members: 45, type: "ثقافي", nextEvent: "ورشة تصوير", date: "2025-01-12" },
    { name: "نادي ريادة الأعمال", members: 80, type: "أكاديمي", nextEvent: "محاضرة ريادية", date: "2025-01-18" },
    { name: "فريق الكورال", members: 30, type: "فني", nextEvent: "حفل موسيقي", date: "2025-01-20" },
  ]

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      "أكاديمي": "bg-institute-blue text-blue-700",
      "رياضي": "bg-institute-blue text-green-700",
      "ثقافي": "bg-institute-gold text-purple-700",
      "فني": "bg-institute-blue text-pink-700",
    }
    return <Badge className={colors[type] || "bg-gray-100 text-gray-700"}>{type}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-institute-blue" />
            الأنشطة الطلابية
          </h1>
          <p className="text-muted-foreground">إدارة الأنشطة والفعاليات الطلابية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          نشاط جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activities */}
      <Card>
        <CardHeader>
          <CardTitle>الأنشطة والأندية</CardTitle>
          <CardDescription>قائمة الأنشطة الطلابية النشطة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-institute-blue flex items-center justify-center">
                    <Award className="w-6 h-6 text-institute-blue" />
                  </div>
                  <div>
                    <h4 className="font-medium">{activity.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getTypeBadge(activity.type)}
                      <span>•</span>
                      <span>{activity.members} عضو</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-sm font-medium">{activity.nextEvent}</p>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
