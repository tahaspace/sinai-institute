"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Gift, Users, Percent, Award, Plus, Eye } from "lucide-react"

export default function ScholarshipsPage() {
  const stats = [
    { label: "المستفيدين", value: "185", icon: Users, color: "text-institute-blue" },
    { label: "منح كاملة", value: "25", icon: Award, color: "text-institute-gold" },
    { label: "إعفاء جزئي", value: "120", icon: Percent, color: "text-institute-blue" },
    { label: "قيمة المنح", value: "2.5M", icon: Gift, color: "text-institute-gold" },
  ]

  const scholarships = [
    { type: "منحة التفوق", percentage: 100, beneficiaries: 25, criteria: "معدل تراكمي 3.7 فأعلى" },
    { type: "منحة الرياضة", percentage: 50, beneficiaries: 40, criteria: "لاعبي المنتخبات" },
    { type: "منحة اجتماعية", percentage: 75, beneficiaries: 60, criteria: "الحالات الاجتماعية" },
    { type: "إعفاء أبناء العاملين", percentage: 30, beneficiaries: 35, criteria: "أبناء موظفي المعهد" },
    { type: "منحة الإعاقة", percentage: 100, beneficiaries: 15, criteria: "ذوي الاحتياجات الخاصة" },
  ]

  const recentBeneficiaries = [
    { name: "أحمد محمد", type: "منحة التفوق", percentage: 100, gpa: 3.85 },
    { name: "سارة علي", type: "منحة اجتماعية", percentage: 75, gpa: 3.2 },
    { name: "محمد حسن", type: "منحة الرياضة", percentage: 50, gpa: 2.8 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-7 h-7 text-institute-blue" />
            المنح والإعفاءات
          </h1>
          <p className="text-muted-foreground">إدارة برامج المنح والإعفاءات المالية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          منحة جديدة
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scholarship Types */}
        <Card>
          <CardHeader>
            <CardTitle>أنواع المنح</CardTitle>
            <CardDescription>برامج المنح والإعفاءات المتاحة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scholarships.map((scholarship, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <h4 className="font-medium">{scholarship.type}</h4>
                    <p className="text-sm text-muted-foreground">{scholarship.criteria}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-institute-gold text-purple-700">{scholarship.percentage}%</Badge>
                    <Badge variant="outline">{scholarship.beneficiaries} مستفيد</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Beneficiaries */}
        <Card>
          <CardHeader>
            <CardTitle>آخر المستفيدين</CardTitle>
            <CardDescription>الطلاب الحاصلين على منح حديثاً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBeneficiaries.map((beneficiary, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <Avatar>
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {beneficiary.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{beneficiary.name}</h4>
                    <p className="text-sm text-muted-foreground">{beneficiary.type}</p>
                  </div>
                  <div className="text-left">
                    <Badge className="bg-institute-blue text-green-700">{beneficiary.percentage}%</Badge>
                    <p className="text-xs text-muted-foreground mt-1">GPA: {beneficiary.gpa}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
