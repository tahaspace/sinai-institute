'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SeedPagesPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      setResults(null);

      const response = await fetch('/api/pages/seed', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('فشلت عملية البذر');
      }

      const data = await response.json();
      setResults(data.results);

      if (data.results.created.length > 0) {
        toast.success(`تم إنشاء ${data.results.created.length} صفحة بنجاح!`);
      } else if (data.results.skipped.length > 0) {
        toast.success('جميع الصفحات موجودة بالفعل!');
      }
    } catch (error: any) {
      console.error('Seeding error:', error);
      toast.error(error.message || 'فشلت عملية البذر');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            إضافة الصفحات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هذه الأداة ستقوم بإضافة 8 صفحات أساسية إلى قاعدة البيانات:
              <ul className="list-disc list-inside mt-2 mr-4">
                <li>الرئيسية (Home)</li>
                <li>عن المعهد (About)</li>
                <li>التسجيل والالتحاق (Admission)</li>
                <li>الأقسام (Departments)</li>
                <li>النتائج (Results)</li>
                <li>الجداول (Schedules)</li>
                <li>التقديم (Apply)</li>
                <li>اتصل بنا (Contact)</li>
              </ul>
              <p className="mt-2 font-bold">
                ✅ الصفحات الموجودة بالفعل سيتم تخطيها تلقائياً
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={handleSeed}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Database className="ml-2 h-5 w-5" />
                  إضافة الصفحات الآن
                </>
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-4 mt-6">
              <h3 className="font-bold text-lg">النتائج:</h3>

              {results.created.length > 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong className="text-green-800">
                      تم إنشاء ({results.created.length} صفحات):
                    </strong>
                    <ul className="list-disc list-inside mt-2 text-green-700">
                      {results.created.map((slug: string) => (
                        <li key={slug}>{slug}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {results.skipped.length > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <strong className="text-yellow-800">
                      تم التخطي - موجودة بالفعل ({results.skipped.length}):
                    </strong>
                    <ul className="list-disc list-inside mt-2 text-yellow-700">
                      {results.skipped.map((slug: string) => (
                        <li key={slug}>{slug}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {results.errors.length > 0 && (
                <Alert className="border-red-500 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-800">
                      فشل الإنشاء ({results.errors.length}):
                    </strong>
                    <ul className="list-disc list-inside mt-2 text-red-700">
                      {results.errors.map((item: any) => (
                        <li key={item.slug}>
                          {item.slug}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 font-bold mb-2">✨ الخطوة التالية:</p>
                <p className="text-blue-700 mb-3">
                  يمكنك الآن الذهاب إلى صفحة إدارة الصفحات وتعديل أي صفحة باستخدام GrapesJS Page Builder!
                </p>
                <Button
                  onClick={() => (window.location.href = '/cms/pages')}
                  variant="default"
                >
                  انتقل إلى إدارة الصفحات
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
