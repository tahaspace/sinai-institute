"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Calendar, MapPin, Plus } from "lucide-react"

export default function OfficeHoursPage() {
  const officeHours = [
    { name: "أ.د. أحمد محمد", department: "الهندسة", days: "الأحد - الثلاثاء", time: "10:00 - 12:00", office: "مكتب 301", available: true },
    { name: "أ.د. سارة علي", department: "الحاسبات", days: "الإثنين - الأربعاء", time: "11:00 - 1:00", office: "مكتب 205", available: true },
    { name: "د. محمد حسن", department: "إدارة الأعمال", days: "الثلاثاء - الخميس", time: "9:00 - 11:00", office: "مكتب 402", available: false },
    { name: "د. نورا سعيد", department: "المحاسبة", days: "الأحد - الإثنين", time: "12:00 - 2:00", office: "مكتب 103", available: true },
    { name: "م. يوسف أحمد", department: "الهندسة", days: "الثلاثاء", time: "10:00 - 12:00", office: "مكتب 310", available: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-7 h-7 text-institute-blue" />
            الساعات المكتبية
          </h1>
          <p className="text-muted-foreground">مواعيد الساعات المكتبية لأعضاء هيئة التدريس</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة موعد
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {officeHours.map((faculty, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-institute-blue text-institute-blue">
                      {faculty.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold">{faculty.name}</h4>
                        <Badge variant="outline" className="mt-1">{faculty.department}</Badge>
                      </div>
                      <Badge className={faculty.available ? "bg-institute-blue text-green-700" : "bg-gray-100 text-gray-700"}>
                        {faculty.available ? "متاح" : "غير متاح"}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{faculty.days}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{faculty.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{faculty.office}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      حجز موعد
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
