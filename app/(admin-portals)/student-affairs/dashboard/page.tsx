'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, UserCheck, AlertCircle } from 'lucide-react';

export default function StudentAffairsDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">بوابة إداري شؤون الطلاب</h1>
        <p className="text-muted-foreground">إدارة ملفات الطلاب والشؤون الأكاديمية</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,990</div>
            <p className="text-xs text-muted-foreground">طالب وطالبة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الطلاب النشطون</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,945</div>
            <p className="text-xs text-green-500">97.7%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">طلبات جديدة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الشكاوى المعلقة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
