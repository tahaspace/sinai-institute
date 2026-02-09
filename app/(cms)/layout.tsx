'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Home, 
  BarChart3, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  FileText, 
  Settings, 
  LogOut 
} from 'lucide-react';

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'لوحة التحكم', href: '/cms/dashboard', icon: LayoutDashboard },
    { name: 'إدارة الصفحة الرئيسية', href: '/cms/homepage', icon: Home },
    { name: 'النتائج', href: '/cms/results', icon: BarChart3 },
    { name: 'الجداول', href: '/cms/schedules', icon: Calendar },
    { name: 'طلبات التقديم', href: '/cms/applications', icon: ClipboardList },
    { name: 'الشكاوى', href: '/cms/complaints', icon: MessageSquare },
    { name: 'الصفحات', href: '/cms/pages', icon: FileText },
    { name: 'الرسائل', href: '/cms/messages', icon: MessageSquare },
    { name: 'الإعدادات', href: '/cms/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">لوحة التحكم</h2>
              <p className="text-xs text-muted-foreground">معهد سيناء العالي</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">
                {navigation.find(item => item.href === pathname)?.name || 'لوحة التحكم'}
              </h1>
              <div className="flex items-center gap-4">
                <Link href="/" target="_blank">
                  <Button variant="outline" size="sm">
                    عرض الموقع
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
