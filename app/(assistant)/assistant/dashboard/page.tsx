'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FileText, Calendar, Clock } from 'lucide-react';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const toMinutes = (t: string) => {
  const [h, m] = t.trim().split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// --- API response shape (served by /api/assistant/dashboard) ---
interface ScheduleItem {
  id: number;
  subject: string;
  time: string;
  room: string;
  day: string;
}
interface DashboardResponse {
  instructor: { id: string; name: string; title: string };
  stats: { courses: number; students: number; needsGrading: number; weeklySections: number };
  weeklySchedule: ScheduleItem[];
}

export default function AssistantDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/assistant/dashboard');
        if (!res.ok) throw new Error('فشل تحميل البيانات');
        const json = (await res.json()) as DashboardResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats;
  const weeklySchedule = data?.weeklySchedule ?? [];

  // Derive the "قادم/مجدول" badge — no backing field. The first lecture today whose
  // start time hasn't passed yet is the upcoming one; everything else is just scheduled.
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcomingId = weeklySchedule.find(
    (l) => l.day === todayName && toMinutes(l.time.split(' - ')[0]) >= nowMinutes
  )?.id;

  // The single soonest upcoming section, used for the real "next section" reminder task.
  const nextSection = upcomingId
    ? weeklySchedule.find((l) => l.id === upcomingId)
    : weeklySchedule[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">مرحباً بك في بوابة المعيد</h1>
        <p className="text-muted-foreground">إدارة السكاشن والمعامل ومساعدة الطلاب</p>
      </div>

      {error && (
        <Card className="mb-8">
          <CardContent className="p-6 text-center text-red-600">{error}</CardContent>
        </Card>
      )}
      {loading && (
        <Card className="mb-8">
          <CardContent className="p-12 text-center text-muted-foreground">جارٍ التحميل...</CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">المقررات المساعدة</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.courses}</div>
                <p className="text-xs text-muted-foreground">مقررات نشطة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الطلاب</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.students}</div>
                <p className="text-xs text-muted-foreground">طالب وطالبة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الواجبات</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.needsGrading}</div>
                <p className="text-xs text-muted-foreground">تحتاج تصحيح</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">السكاشن الأسبوعية</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.weeklySections}</div>
                <p className="text-xs text-muted-foreground">حصة أسبوعياً</p>
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
                  {weeklySchedule.length === 0 && (
                    <p className="text-sm text-muted-foreground">لا توجد سكاشن مجدولة</p>
                  )}
                  {weeklySchedule.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{item.subject}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {item.day} {item.time} - {item.room}
                        </div>
                      </div>
                      {item.id === upcomingId ? (
                        <Badge>قادم</Badge>
                      ) : (
                        <Badge variant="outline">مجدول</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>مهام عاجلة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.needsGrading > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-2">تصحيح واجبات</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{stats.needsGrading} واجب</span>
                        <Button size="sm">بدء التصحيح</Button>
                      </div>
                    </div>
                  )}
                  {nextSection && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium mb-2">السكشن القادم: {nextSection.subject}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {nextSection.day} {nextSection.time}
                        </span>
                        <Button size="sm" variant="outline">عرض</Button>
                      </div>
                    </div>
                  )}
                  {stats.needsGrading === 0 && !nextSection && (
                    <p className="text-sm text-muted-foreground">لا توجد مهام عاجلة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
