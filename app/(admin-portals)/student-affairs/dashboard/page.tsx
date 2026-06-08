'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, UserCheck, AlertCircle } from 'lucide-react';

interface Summary {
  students: number;
  active: number;
  activePct: number;
  newApplications: number;
  pendingComplaints: number;
}

export default function StudentAffairsDashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/student-affairs');
        if (res.ok && !cancelled) setData(await res.json());
      } catch {
        /* leave data null → cards show — */
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
            <div className="text-2xl font-bold">{fmt(data?.students)}</div>
            <p className="text-xs text-muted-foreground">طالب وطالبة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الطلاب النشطون</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.active)}</div>
            <p className="text-xs text-green-500">{data ? `${data.activePct}%` : '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">طلبات جديدة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.newApplications)}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الشكاوى المعلقة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data?.pendingComplaints)}</div>
            <p className="text-xs text-muted-foreground">تحتاج معالجة</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
