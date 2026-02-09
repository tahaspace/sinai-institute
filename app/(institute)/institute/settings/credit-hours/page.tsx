"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ClipboardList, Save, Info } from "lucide-react"

export default function CreditHoursSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-institute-blue" />
            إعدادات نظام الساعات المعتمدة
          </h1>
          <p className="text-muted-foreground">تكوين نظام الساعات المعتمدة والتسجيل</p>
        </div>
        <Button>
          <Save className="w-4 h-4 ml-2" />
          حفظ التغييرات
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التسجيل</CardTitle>
            <CardDescription>تحديد قواعد تسجيل المقررات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الحد الأدنى للساعات في الفصل</Label>
              <Input type="number" defaultValue="12" className="mt-1" />
            </div>
            <div>
              <Label>الحد الأقصى للساعات في الفصل</Label>
              <Input type="number" defaultValue="21" className="mt-1" />
            </div>
            <div>
              <Label>الحد الأقصى للطالب المتفوق (GPA ≥ 3.5)</Label>
              <Input type="number" defaultValue="24" className="mt-1" />
            </div>
            <div>
              <Label>الحد الأقصى للطالب المنذر</Label>
              <Input type="number" defaultValue="14" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* GPA Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات المعدل التراكمي</CardTitle>
            <CardDescription>تحديد حدود التقديرات والإنذارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>الحد الأدنى للنجاح (GPA)</Label>
              <Input type="number" step="0.01" defaultValue="2.00" className="mt-1" />
            </div>
            <div>
              <Label>حد الإنذار الأول</Label>
              <Input type="number" step="0.01" defaultValue="2.00" className="mt-1" />
            </div>
            <div>
              <Label>حد الإنذار الثاني</Label>
              <Input type="number" step="0.01" defaultValue="1.75" className="mt-1" />
            </div>
            <div>
              <Label>حد الفصل</Label>
              <Input type="number" step="0.01" defaultValue="1.50" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Grade Scale */}
        <Card>
          <CardHeader>
            <CardTitle>مقياس التقديرات</CardTitle>
            <CardDescription>نظام النقاط والتقديرات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { grade: "A+", points: "4.00", range: "90-100%" },
                { grade: "A", points: "3.75", range: "85-89%" },
                { grade: "B+", points: "3.50", range: "80-84%" },
                { grade: "B", points: "3.00", range: "75-79%" },
                { grade: "C+", points: "2.50", range: "70-74%" },
                { grade: "C", points: "2.00", range: "65-69%" },
                { grade: "D+", points: "1.50", range: "60-64%" },
                { grade: "D", points: "1.00", range: "50-59%" },
                { grade: "F", points: "0.00", range: "أقل من 50%" },
              ].map((item) => (
                <div key={item.grade} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="font-bold">{item.grade}</Badge>
                  <span className="text-sm">{item.range}</span>
                  <Badge className="bg-institute-blue text-institute-blue">{item.points}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات متقدمة</CardTitle>
            <CardDescription>خيارات إضافية للنظام</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">السماح بالتسجيل المبكر</p>
                <p className="text-sm text-muted-foreground">للطلاب المتفوقين</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">التسجيل المتأخر</p>
                <p className="text-sm text-muted-foreground">بعد انتهاء الفترة الرسمية</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">حذف المقرر تلقائياً</p>
                <p className="text-sm text-muted-foreground">عند تجاوز حد الغياب</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">إشعارات الإنذار</p>
                <p className="text-sm text-muted-foreground">تنبيه الطلاب والأولياء</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
