'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, CreditCard, AlertTriangle } from 'lucide-react';

interface Summary {
  totalDues: number;
  collected: number;
  remaining: number;
  collectionRate: number;
  pendingPayments: number;
}

export default function AccountantDashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/accountant');
        if (res.ok && !cancelled) setData(await res.json());
      } catch {
        /* leave null → — */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const egp = (n: number | undefined) => (n == null ? '—' : `${n.toLocaleString()} ج.م`);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">بوابة المحاسب</h1>
        <p className="text-muted-foreground">إدارة الشؤون المالية والمصروفات</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التحصيل</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{egp(data?.collected)}</div>
            <p className="text-xs text-green-500">{data ? `نسبة التحصيل ${data.collectionRate}%` : '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المتبقي</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{egp(data?.remaining)}</div>
            <p className="text-xs text-muted-foreground">مستحقات غير محصلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{egp(data?.totalDues)}</div>
            <p className="text-xs text-muted-foreground">للعام الدراسي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدفعات المعلقة</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pendingPayments ?? '—'}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
