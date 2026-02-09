'use client';

import { use, useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { motion } from 'framer-motion';

interface Page {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  contentAr?: string;
  customCSS?: string;
  isPublished: boolean;
}

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      
      // First, try to load from API
      const response = await fetch(`/api/pages?slug=${slug}&published=true`);
      
      if (response.ok) {
        const data = await response.json();
        const foundPage = data.pages.find((p: any) => p.slug === slug && p.isPublished);
        
        if (foundPage) {
          setPage(foundPage);
          return;
        }
      }
      
      // If not found in API, check localStorage (for backward compatibility)
      const savedPages = localStorage.getItem('cms_pages');
      if (savedPages) {
        const pages = JSON.parse(savedPages);
        const foundPage = pages.find(
          (p: any) => p.slug === slug && p.status === 'published'
        );
        
        if (foundPage) {
          setPage({
            id: foundPage.id,
            titleAr: foundPage.title || foundPage.titleAr,
            titleEn: foundPage.titleEn || foundPage.title,
            slug: foundPage.slug,
            contentAr: foundPage.content,
            customCSS: foundPage.customCSS,
            isPublished: true,
          });
          return;
        }
      }
      
      // Page not found
      setPage(null);
    } catch (error) {
      console.error('Error loading page:', error);
      setPage(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      {/* Custom CSS */}
      {page.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: page.customCSS }} />
      )}

      {/* Page Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {page.contentAr ? (
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: page.contentAr }}
                style={{ direction: 'rtl' }}
              />
            ) : (
              <div className="text-center py-20">
                <h1 className="text-4xl font-bold mb-4">{page.titleAr}</h1>
                <p className="text-muted-foreground">المحتوى قيد الإنشاء...</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
