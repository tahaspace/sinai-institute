"use client"

import {
  FileText,
  Download,
  GraduationCap,
  Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Children
const children = [
  { id: 1, name: "أحمد محمد علي", avatar: "أ" },
  { id: 2, name: "سارة محمد علي", avatar: "س" },
]

// Available Reports
const reports = [
  { id: 1, title: "تقرير نصف العام", type: "semester", date: "2024-12-20", status: "available" },
  { id: 2, title: "تقرير الحضور الشهري", type: "attendance", date: "2024-12-01", status: "available" },
  { id: 3, title: "تقرير السلوك", type: "behavior", date: "2024-12-15", status: "available" },
  { id: 4, title: "تقرير نهاية العام", type: "semester", date: "2025-06-01", status: "upcoming" },
]

// Certificates
const certificates = [
  { id: 1, title: "شهادة نصف العام", year: "2024/2025", status: "available" },
  { id: 2, title: "شهادة نهاية العام", year: "2023/2024", status: "available" },
]

export default function ParentReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">التقارير والشهادات</h1>
        <p className="text-muted-foreground">تحميل تقارير وشهادات الأبناء</p>
      </div>

      {/* Children Tabs */}
      <Tabs defaultValue="1">
        <TabsList className="w-full justify-start">
          {children.map((child) => (
            <TabsTrigger key={child.id} value={child.id.toString()} className="gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-pink-100 text-pink-600">
                  {child.avatar}
                </AvatarFallback>
              </Avatar>
              {child.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {children.map((child) => (
          <TabsContent key={child.id} value={child.id.toString()} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    التقارير
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            report.status === "available" ? "bg-green-100" : "bg-gray-100"
                          )}>
                            <FileText className={cn(
                              "w-5 h-5",
                              report.status === "available" ? "text-green-600" : "text-gray-400"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(report.date).toLocaleDateString("ar-EG")}
                            </p>
                          </div>
                        </div>
                        {report.status === "available" ? (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 ml-2" />
                            تحميل
                          </Button>
                        ) : (
                          <Badge variant="outline">قريباً</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    الشهادات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium">{cert.title}</p>
                            <p className="text-sm text-muted-foreground">{cert.year}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 ml-2" />
                          تحميل
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}



