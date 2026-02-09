"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FlaskConical, Search, Plus, BookOpen, Award, Users, FileText, TrendingUp, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const researchProjects = [
  { id: 1, title: "تطوير نظام ذكاء اصطناعي للتعليم", status: "active", progress: 75, team: 4, funding: "500,000 جنيه" },
  { id: 2, title: "تحليل البيانات الضخمة في التعليم", status: "active", progress: 45, team: 3, funding: "300,000 جنيه" },
  { id: 3, title: "أمن المعلومات في التعلم الإلكتروني", status: "completed", progress: 100, team: 2, funding: "200,000 جنيه" },
]

const publications = [
  { title: "Machine Learning in Education", journal: "IEEE Transactions", year: 2024, citations: 45 },
  { title: "AI-Powered Learning Systems", journal: "ACM Conference", year: 2024, citations: 28 },
  { title: "Data Analytics in Higher Education", journal: "Springer", year: 2023, citations: 32 },
]

export default function FacultyResearchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-indigo-600" />
            البحث العلمي
          </h1>
          <p className="text-gray-500 mt-1">إدارة المشاريع البحثية والمنشورات</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 ml-2" />
          مشروع جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "المشاريع البحثية", value: 3, icon: FlaskConical, color: "indigo" },
          { label: "المنشورات", value: 8, icon: BookOpen, color: "purple" },
          { label: "الاستشهادات", value: 105, icon: TrendingUp, color: "green" },
          { label: "طلاب تحت الإشراف", value: 5, icon: Users, color: "blue" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`border-r-4 border-r-${stat.color}-500`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">المشاريع البحثية</TabsTrigger>
          <TabsTrigger value="publications">المنشورات</TabsTrigger>
          <TabsTrigger value="supervision">الإشراف</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-4">
          {researchProjects.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{project.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={project.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {project.status === "active" ? "نشط" : "مكتمل"}
                        </Badge>
                        <span className="text-sm text-gray-500">التمويل: {project.funding}</span>
                        <span className="text-sm text-gray-500">الفريق: {project.team} باحثين</span>
                      </div>
                    </div>
                    <Button variant="outline">عرض التفاصيل</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{project.progress}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="publications" className="mt-4 space-y-4">
          {publications.map((pub, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{pub.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">{pub.journal}</Badge>
                      <span className="text-sm text-gray-500">{pub.year}</span>
                      <span className="text-sm text-gray-500">{pub.citations} استشهاد</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="supervision" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>قائمة طلاب الدراسات العليا تحت الإشراف</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
