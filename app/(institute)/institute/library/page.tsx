"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Library, Search, BookOpen, Users, Clock, Plus, Download } from "lucide-react"

export default function LibraryPage() {
  const stats = [
    { label: "إجمالي الكتب", value: "12,500", icon: BookOpen, color: "text-institute-blue" },
    { label: "كتب إلكترونية", value: "3,200", icon: Download, color: "text-institute-blue" },
    { label: "إعارات نشطة", value: "450", icon: Clock, color: "text-yellow-600" },
    { label: "أعضاء المكتبة", value: "2,100", icon: Users, color: "text-institute-gold" },
  ]

  const recentBooks = [
    { title: "هياكل البيانات والخوارزميات", author: "د. أحمد محمد", category: "حاسبات", available: 5 },
    { title: "مبادئ المحاسبة المالية", author: "د. سارة علي", category: "محاسبة", available: 3 },
    { title: "إدارة الموارد البشرية", author: "د. محمد حسن", category: "إدارة", available: 8 },
    { title: "الرياضيات الهندسية", author: "د. نورا سعيد", category: "هندسة", available: 2 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="w-7 h-7 text-institute-blue" />
            المكتبة
          </h1>
          <p className="text-muted-foreground">إدارة المكتبة الرقمية والورقية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة كتاب
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث عن كتاب..." className="pr-10" />
      </div>

      {/* Books */}
      <Card>
        <CardHeader>
          <CardTitle>الكتب الأكثر طلباً</CardTitle>
          <CardDescription>كتب متاحة للإعارة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {recentBooks.map((book, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg border"
              >
                <div className="w-16 h-20 rounded bg-institute-blue flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-institute-blue" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{book.title}</h4>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{book.category}</Badge>
                    <Badge className={book.available > 0 ? "bg-institute-blue text-green-700" : "bg-red-100 text-red-700"}>
                      {book.available} متاح
                    </Badge>
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
