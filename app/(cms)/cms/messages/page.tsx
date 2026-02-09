'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">الرسائل</h1>
        <p className="text-muted-foreground">رسائل اتصل بنا من الموقع</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">غير مقروءة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد رسائل حالياً</p>
            <p className="text-sm mt-2">سيتم عرض رسائل اتصل بنا هنا</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
