'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FileText, Calendar, Clock } from 'lucide-react';

export default function AssistantDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">مرحباً بك في بوابة المعيد</h1>
        <p className="text-muted-foreground">إدارة السكاشن والمعامل ومساعدة الطلاب</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المقررات المساعدة</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">مقررات نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">180</div>
            <p className="text-xs text-muted-foreground">طالب وطالبة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الواجبات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">تحتاج تصحيح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">السكاشن القادمة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>جدولي الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">سكشن برمجة 1</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    الأحد 10:00 ص - معمل 2
                  </div>
                </div>
                <Badge>قادم</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">سكشن قواعد بيانات</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    الثلاثاء 2:00 م - معمل 3
                  </div>
                </div>
                <Badge variant="outline">مجدول</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مهام عاجلة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium mb-2">تصحيح واجب برمجة 1</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">12 واجب</span>
                  <Button size="sm">بدء التصحيح</Button>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium mb-2">تجهيز محتوى السكشن القادم</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">باقي يومان</span>
                  <Button size="sm" variant="outline">عرض</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
