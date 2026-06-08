'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface Summary {
  titles: number;
  totalCopies: number;
  available: number;
  borrowed: number;
  overdue: number;
}

export default function LibraryAdminDashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/library');
        if (res.ok && !cancelled) setData(await res.json());
      } catch {
        /* leave null → — */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const fmt = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">بوابة إداري المكتبة</h1>
        <p className="text-muted-foreground">إدارة المكتبة والإعارات والمخزون</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النسخ</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.totalCopies)}</div>
            <p className="text-xs text-muted-foreground">{data ? `${data.titles} عنوان` : '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الإعارات النشطة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.borrowed)}</div>
            <p className="text-xs text-muted-foreground">إعارة حالية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المتاح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.available)}</div>
            <p className="text-xs text-muted-foreground">نسخة متاحة للإعارة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fmt(data?.overdue)}</div>
            <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>طلبات الإعارة اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">أساسيات البرمجة</div>
                  <div className="text-sm text-muted-foreground">أحمد محمد - رقم 2401</div>
                </div>
                <Button size="sm">موافقة</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الكتب الأكثر طلباً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>قواعد البيانات المتقدمة</span>
                <Badge>45 طلب</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>هندسة البرمجيات</span>
                <Badge variant="outline">32 طلب</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
