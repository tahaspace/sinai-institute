'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Globe, Phone, Mail, MapPin, Facebook, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'معهد سيناء العالي للدراسات النوعية',
    siteDescription: 'Sinai Higher Institute for Specific Studies',
    phone: '+201220822224',
    email: 'info@sainaiinstitute.com',
    address: 'المدينة التعليمية بالإسماعيلية',
    facebook: 'https://www.facebook.com/sinaiinistitute',
    aboutText: '',
    headerLogo: '/logo.png',
    footerText: 'Powered by Smart Innovation: info@sictb.com',
  });

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات الموقع العامة</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="ml-2 h-4 w-4" />
            عام
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="ml-2 h-4 w-4" />
            معلومات الاتصال
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Globe className="ml-2 h-4 w-4" />
            المظهر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
              <CardDescription>معلومات الموقع الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الموقع</Label>
                <Input
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>وصف الموقع</Label>
                <Input
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>نبذة عن المعهد</Label>
                <Textarea
                  value={settings.aboutText}
                  onChange={(e) => setSettings({ ...settings, aboutText: e.target.value })}
                  rows={5}
                  placeholder="مؤسسة تعليمية رائدة..."
                />
              </div>
              <Button onClick={handleSave}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
              <CardDescription>بيانات الاتصال بالمعهد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  <Phone className="inline h-4 w-4 ml-1" />
                  رقم التليفون
                </Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Mail className="inline h-4 w-4 ml-1" />
                  البريد الإلكتروني
                </Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <MapPin className="inline h-4 w-4 ml-1" />
                  العنوان
                </Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Facebook className="inline h-4 w-4 ml-1" />
                  رابط Facebook
                </Label>
                <Input
                  value={settings.facebook}
                  onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                />
              </div>
              <Button onClick={handleSave}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات المظهر</CardTitle>
              <CardDescription>Header & Footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>مسار اللوجو في الهيدر</Label>
                <Input
                  value={settings.headerLogo}
                  onChange={(e) => setSettings({ ...settings, headerLogo: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  اللوجو الحالي: /logo.png
                </p>
              </div>
              <div className="space-y-2">
                <Label>نص الفوتر</Label>
                <Input
                  value={settings.footerText}
                  onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">معلومات إضافية:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• اللوجو يظهر في الهيدر بأبعاد 205x48 بكسل</li>
                  <li>• الفوتر يحتوي على معلومات المعهد والروابط</li>
                  <li>• يمكن تعديل الألوان من ملف Tailwind Config</li>
                </ul>
              </div>
              <Button onClick={handleSave}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
