"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, ArrowLeftRight, Plus, Eye, CheckCircle, XCircle, Clock } from "lucide-react"

export default function TransfersPage() {
  const incomingTransfers = [
    { id: 1, name: "أحمد محمد", from: "جامعة القاهرة", department: "الهندسة", date: "2024-12-20", status: "pending" },
    { id: 2, name: "سارة علي", from: "جامعة عين شمس", department: "الحاسبات", date: "2024-12-18", status: "approved" },
    { id: 3, name: "محمد حسن", from: "معهد أخر", department: "إدارة الأعمال", date: "2024-12-15", status: "rejected" },
  ]

  const outgoingTransfers = [
    { id: 1, name: "نور سعيد", to: "جامعة الإسكندرية", department: "المحاسبة", date: "2024-12-22", status: "pending" },
    { id: 2, name: "يوسف أحمد", to: "جامعة المنصورة", department: "الهندسة", date: "2024-12-19", status: "approved" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>
      case "approved":
        return <Badge className="bg-institute-blue text-green-700"><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-institute-blue" />
            التحويلات
          </h1>
          <p className="text-muted-foreground">إدارة طلبات التحويل من وإلى المعهد</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          طلب تحويل جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "طلبات واردة", value: "15", color: "text-institute-blue" },
          { label: "طلبات صادرة", value: "8", color: "text-institute-blue" },
          { label: "في الانتظار", value: "5", color: "text-yellow-600" },
          { label: "مكتملة", value: "18", color: "text-institute-gold" },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">تحويلات واردة</TabsTrigger>
          <TabsTrigger value="outgoing">تحويلات صادرة</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <Card>
            <CardHeader>
              <CardTitle>طلبات التحويل الواردة</CardTitle>
              <CardDescription>طلبات التحويل من مؤسسات أخرى إلى المعهد</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>المؤسسة السابقة</TableHead>
                    <TableHead>القسم المطلوب</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.name}</TableCell>
                      <TableCell>{transfer.from}</TableCell>
                      <TableCell>{transfer.department}</TableCell>
                      <TableCell>{transfer.date}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card>
            <CardHeader>
              <CardTitle>طلبات التحويل الصادرة</CardTitle>
              <CardDescription>طلبات التحويل من المعهد إلى مؤسسات أخرى</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الطالب</TableHead>
                    <TableHead>المؤسسة المطلوبة</TableHead>
                    <TableHead>القسم الحالي</TableHead>
                    <TableHead>تاريخ الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outgoingTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.name}</TableCell>
                      <TableCell>{transfer.to}</TableCell>
                      <TableCell>{transfer.department}</TableCell>
                      <TableCell>{transfer.date}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
