'use client';

import { use, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import GrapesBuilder to avoid SSR issues
const GrapesBuilder = dynamic(
  () => import('@/components/page-builder/grapes-builder'),
  { ssr: false }
);

interface Page {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  contentAr?: string;
  contentEn?: string;
  customCSS?: string;
}

export default function PageBuilderGrapesPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialHtml, setInitialHtml] = useState('');
  const [initialCss, setInitialCss] = useState('');

  useEffect(() => {
    loadPage();
  }, [pageId]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pages/${pageId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load page');
      }
      
      const data = await response.json();
      setPage(data.page);
      
      // Set initial HTML and CSS
      setInitialHtml(data.page.contentAr || '');
      setInitialCss(data.page.customCSS || '');
    } catch (error) {
      console.error('Error loading page:', error);
      toast.error('فشل في تحميل الصفحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (html: string, css: string) => {
    try {
      console.log('💾 Saving page:', {
        pageId,
        htmlLength: html.length,
        cssLength: css.length,
      });

      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentAr: html,
          contentEn: html, // Same for both languages for now
          customCSS: css,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Save failed:', error);
        throw new Error('Failed to save page');
      }

      const result = await response.json();
      console.log('✅ Save successful:', {
        pageId: result.page?.id,
        hasContentAr: !!result.page?.contentAr,
        hasCustomCSS: !!result.page?.customCSS,
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Error saving page:', error);
      return Promise.reject(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل Page Builder...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">الصفحة غير موجودة</p>
          <Button onClick={() => router.push('/cms/pages-new')}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للصفحات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-background border-b p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cms/pages-new')}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-lg font-bold">{page.titleAr}</h1>
            <p className="text-sm text-muted-foreground">Page Builder - GrapesJS</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          /{page.slug}
        </div>
      </div>

      {/* GrapesJS Builder */}
      <div className="flex-1 overflow-hidden">
        <GrapesBuilder
          pageId={pageId}
          initialHtml={initialHtml}
          initialCss={initialCss}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
