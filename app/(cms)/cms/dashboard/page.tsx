'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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

export default function DashboardPage() {
  const quickStats = [
    { label: 'طلبات التقديم الجديدة', value: '24', color: 'text-blue-600', trend: '+12%' },
    { label: 'الشكاوى المعلقة', value: '8', color: 'text-yellow-600', trend: '-4%' },
    { label: 'النتائج المتاحة', value: '4', color: 'text-purple-600', trend: '0%' },
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
              <div className="flex items-center justify-between">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className={`text-sm ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                  {stat.trend} من الشهر الماضي
                </div>
              </div>
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
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm">طلب تقديم جديد من أحمد محمد علي</p>
                <p className="text-xs text-muted-foreground">منذ 5 دقائق - إدارة ضيافة</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <div className="flex-1">
                <p className="text-sm">شكوى جديدة من فاطمة حسن</p>
                <p className="text-xs text-muted-foreground">منذ 15 دقيقة - إرشاد سياحي</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <p className="text-sm">تم نشر خبر جديد: بدء التسجيل للفصل الدراسي</p>
                <p className="text-xs text-muted-foreground">منذ ساعة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
