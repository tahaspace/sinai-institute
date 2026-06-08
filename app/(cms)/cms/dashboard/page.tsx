'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  BookOpen,
  Calendar,
  ClipboardList,
  Home,
  Settings,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  newApplications: number;
  pendingComplaints: number;
  availableResults: number;
}

interface ActivityItem {
  id: string;
  type: 'application' | 'complaint' | 'news';
  label: string;
  detail: string | null;
  at: string;
}

interface DashboardResponse {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

const activityDotColor: Record<ActivityItem['type'], string> = {
  application: 'bg-blue-500',
  complaint: 'bg-yellow-500',
  news: 'bg-green-500',
};

// Relative 'منذ X' label derived client-side from the ISO timestamp the API returns.
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/cms/dashboard');
        if (!res.ok) throw new Error('فشل تحميل البيانات');
        const json = (await res.json()) as DashboardResponse;
        if (!cancelled) {
          setStats(json.stats ?? null);
          setRecentActivity(json.recentActivity ?? []);
        }
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

  const quickStats = [
    { label: 'طلبات التقديم الجديدة', value: stats?.newApplications ?? 0, color: 'text-blue-600' },
    { label: 'الشكاوى المعلقة', value: stats?.pendingComplaints ?? 0, color: 'text-yellow-600' },
    { label: 'النتائج المتاحة', value: stats?.availableResults ?? 0, color: 'text-purple-600' },
  ];

  const managementSections = [
    {
      title: 'إدارة المحتوى',
      items: [
        {
          title: 'إدارة الصفحة الرئيسية',
          description: 'Slider, إحصائيات, شريط الأخبار, التخصصات',
          icon: Home,
          href: '/cms/homepage',
          color: 'bg-purple-500',
        },
      ],
    },
    {
      title: 'إدارة الطلاب',
      items: [
        {
          title: 'طلبات التقديم',
          description: 'مراجعة وقبول الطلبات',
          icon: ClipboardList,
          href: '/cms/applications',
          color: 'bg-orange-500',
        },
        {
          title: 'الشكاوى',
          description: 'متابعة شكاوى الطلاب',
          icon: MessageSquare,
          href: '/cms/complaints',
          color: 'bg-red-500',
        },
        {
          title: 'النتائج',
          description: 'رفع وإدارة النتائج',
          icon: BarChart3,
          href: '/cms/results',
          color: 'bg-indigo-500',
        },
        {
          title: 'الجداول',
          description: 'جداول المحاضرات',
          icon: Calendar,
          href: '/cms/schedules',
          color: 'bg-teal-500',
        },
      ],
    },
    {
      title: 'الإعدادات',
      items: [
        {
          title: 'إعدادات الموقع',
          description: 'Header, Footer, معلومات الاتصال',
          icon: Settings,
          href: '/cms/settings',
          color: 'bg-gray-500',
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground">مرحباً بك في نظام إدارة معهد سيناء العالي</p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground mb-4">جارٍ التحميل...</p>
      )}

      {error && (
        <Card className="mb-8 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management Sections */}
      {managementSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-8">
          <h2 className="text-xl font-bold mb-4">{section.title}</h2>
          <div className={`grid gap-4 ${section.items.length === 1 ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-3'}`}>
            {section.items.map((item, itemIndex) => (
              <Link key={itemIndex} href={item.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${item.color} text-white`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>أحدث النشاطات</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading ? 'جارٍ التحميل...' : 'لا توجد نشاطات حديثة'}
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${activityDotColor[item.type]}`}></div>
                  <div className="flex-1">
                    <p className="text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.at)}
                      {item.detail ? ` - ${item.detail}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
