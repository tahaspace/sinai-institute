'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MigratePagesPage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleMigrate = async () => {
    try {
      setIsMigrating(true);
      setResults(null);

      // Get pages from localStorage
      const savedPages = localStorage.getItem('cms_pages');
      if (!savedPages) {
        toast.error('لا توجد صفحات في localStorage للترحيل');
        return;
      }

      const pages = JSON.parse(savedPages);

      // Send to API
      const response = await fetch('/api/pages/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      });

      if (!response.ok) {
        throw new Error('فشل الترحيل');
      }

      const data = await response.json();
      setResults(data.results);

      if (data.results.success.length > 0) {
        toast.success(`تم ترحيل ${data.results.success.length} صفحة بنجاح!`);
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'فشل الترحيل');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            ترحيل الصفحات من localStorage إلى قاعدة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هذه الأداة تساعدك في نقل الصفحات القديمة من localStorage إلى قاعدة البيانات الجديدة.
              سيتم تجاهل الصفحات الموجودة بالفعل في قاعدة البيانات.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={handleMigrate}
              disabled={isMigrating}
            >
              <Database className="ml-2 h-5 w-5" />
              {isMigrating ? 'جاري الترحيل...' : 'بدء الترحيل'}
            </Button>
          </div>

          {results && (
            <div className="space-y-4 mt-6">
              <h3 className="font-bold text-lg">نتائج الترحيل:</h3>

              {results.success.length > 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong className="text-green-800">نجح الترحيل ({results.success.length}):</strong>
                    <ul className="list-disc list-inside mt-2 text-green-700">
                      {results.success.map((slug: string) => (
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
                    <strong className="text-yellow-800">تم التخطي (موجودة بالفعل) ({results.skipped.length}):</strong>
                    <ul className="list-disc list-inside mt-2 text-yellow-700">
                      {results.skipped.map((slug: string) => (
                        <li key={slug}>{slug}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {results.failed.length > 0 && (
                <Alert className="border-red-500 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-800">فشل الترحيل ({results.failed.length}):</strong>
                    <ul className="list-disc list-inside mt-2 text-red-700">
                      {results.failed.map((item: any) => (
                        <li key={item.slug}>
                          {item.slug}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
