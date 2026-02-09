'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PublicLayout from '@/components/layouts/public-layout';

interface PageBlock {
  id: string;
  type: string;
  content: string;
  order: number;
}

interface PageData {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  contentAr?: string;
  contentEn?: string;
  isPublished: boolean;
  blocks?: PageBlock[];
}

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  
  console.log('🔄 DynamicPage render - slug:', slug, 'loading:', loading, 'hasPage:', !!page);

  useEffect(() => {
    let mounted = true;
    
    const fetchPage = async () => {
      try {
        console.log('🔍 Fetching page:', slug);

        // Try API first (no cache) - add timestamp to bust cache
        const timestamp = Date.now();
        const response = await fetch(`/api/pages?slug=${slug}&_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        
        console.log('📡 API Response:', response.status, response.ok);
        
        if (!mounted) return;
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 API Data:', { hasPages: !!data.pages, count: data.pages?.length });
          
          if (data.pages && data.pages.length > 0) {
            const pageData = data.pages[0];

            // Debug logging
            console.log('📄 Page Data:', {
              id: pageData.id,
              slug: pageData.slug,
              isPublished: pageData.isPublished,
              hasContentAr: !!pageData.contentAr,
              contentArLength: pageData.contentAr?.length || 0,
            });

            // Check if page is published
            if (!pageData.isPublished) {
              console.log('⚠️ Page not published');
              if (mounted) {
                setPage(null);
                setLoading(false);
              }
              return;
            }

            // DON'T fetch blocks - just use contentAr directly from API
            console.log('✅ Setting page data with contentAr');
            console.log('Mounted state:', mounted);
            console.log('Page data to set:', { 
              id: pageData.id, 
              slug: pageData.slug,
              contentArPreview: pageData.contentAr?.substring(0, 100) 
            });
            
            if (mounted) {
              console.log('🎯 Calling setPage and setLoading(false)');
              setPage(pageData);
              setLoading(false);
              console.log('✅ State updated successfully');
            } else {
              console.log('⚠️ Component unmounted, skipping state update');
            }
            return;
          } else {
            console.log('⚠️ No pages found in response');
          }
        } else {
          console.error('❌ API response not ok:', response.status);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }

        // No pages found - set loading to false anyway
        console.log('❌ Page not found in database');
        if (mounted) {
          setPage(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Critical error fetching page:', error);
        if (mounted) {
          setPage(null);
          setLoading(false);
        }
      }
    };

    if (slug) {
      console.log('🚀 Starting fetch for:', slug);
      setLoading(true);
      fetchPage();
    }
    
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 pt-32 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الصفحة...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return notFound();
  }

  // Render GrapesJS content if available
  // Check both blocks and contentAr for backwards compatibility
  const hasGrapesJsContent = page.blocks && page.blocks.length > 0;
  const grapesJsHtml = hasGrapesJsContent 
    ? page.blocks?.find(b => b.type === 'html')?.content || ''
    : page.contentAr || '';
  const grapesJsCss = hasGrapesJsContent 
    ? page.blocks?.find(b => b.type === 'css')?.content || ''
    : (page as any).customCSS || '';

  // Determine if we have any content to display
  const hasContent = grapesJsHtml || page.contentAr;

  return (
    <>
      {/* Inject GrapesJS CSS or customCSS */}
      {grapesJsCss && (
        <style dangerouslySetInnerHTML={{ __html: grapesJsCss }} />
      )}

      <div className="pt-32 min-h-screen">
        {/* Render GrapesJS HTML content or contentAr */}
        {hasContent ? (
          <div 
            className="gjs-page-content"
            dangerouslySetInnerHTML={{ __html: grapesJsHtml }} 
          />
        ) : (
          // Fallback: Empty page
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-6">{page.titleAr}</h1>
              <p className="text-muted-foreground">
                هذه الصفحة فارغة. يمكنك تعديلها من لوحة التحكم.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
