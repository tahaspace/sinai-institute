"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { BookOpen, Users, Clock, GraduationCap, Plus, ChevronLeft } from "lucide-react"

export default function ProgramsPage() {
  const programs = [
    { id: 1, name: "هندسة الحاسبات", dept: "الهندسة", duration: "4 سنوات", creditHours: 160, students: 185, type: "بكالوريوس" },
    { id: 2, name: "هندسة الاتصالات", dept: "الهندسة", duration: "4 سنوات", creditHours: 160, students: 165, type: "بكالوريوس" },
    { id: 3, name: "هندسة الإلكترونيات", dept: "الهندسة", duration: "4 سنوات", creditHours: 160, students: 170, type: "بكالوريوس" },
    { id: 4, name: "علوم الحاسب", dept: "الحاسبات", duration: "4 سنوات", creditHours: 140, students: 210, type: "بكالوريوس" },
    { id: 5, name: "نظم المعلومات", dept: "الحاسبات", duration: "4 سنوات", creditHours: 140, students: 150, type: "بكالوريوس" },
    { id: 6, name: "الذكاء الاصطناعي", dept: "الحاسبات", duration: "4 سنوات", creditHours: 140, students: 120, type: "بكالوريوس" },
    { id: 7, name: "إدارة الأعمال", dept: "إدارة الأعمال", duration: "4 سنوات", creditHours: 130, students: 195, type: "بكالوريوس" },
    { id: 8, name: "التسويق", dept: "إدارة الأعمال", duration: "4 سنوات", creditHours: 130, students: 125, type: "بكالوريوس" },
    { id: 9, name: "المحاسبة", dept: "المحاسبة", duration: "4 سنوات", creditHours: 130, students: 220, type: "بكالوريوس" },
    { id: 10, name: "إدارة الفنادق", dept: "السياحة", duration: "4 سنوات", creditHours: 130, students: 130, type: "بكالوريوس" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-institute-blue" />
            البرامج الأكاديمية
          </h1>
          <p className="text-muted-foreground">إدارة البرامج الدراسية المتاحة</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          إضافة برنامج
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{program.type}</Badge>
                  <Badge variant="outline">{program.dept}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{program.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{program.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span>{program.creditHours} ساعة</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-institute-blue" />
                    <span className="font-bold text-institute-blue">{program.students}</span>
                    <span className="text-sm text-muted-foreground">طالب</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
