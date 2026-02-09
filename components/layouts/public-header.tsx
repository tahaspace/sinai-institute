'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewsTicker from '@/components/shared/news-ticker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  showInHeader: boolean;
  order: number;
  parentId: string | null;
}

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // تحميل الصفحات من API و localStorage
  useEffect(() => {
    const loadPages = async () => {
      try {
        // Try API first
        const response = await fetch('/api/pages?published=true');
        if (response.ok) {
          const data = await response.json();
          const pages: CMSPage[] = data.pages
            .filter((p: any) => p.isPublished && p.showInHeader)
            .map((p: any) => ({
              id: p.id,
              title: p.titleAr,
              slug: p.slug,
              status: 'published',
              showInHeader: p.showInHeader,
              order: p.order,
              parentId: p.parentId,
            }))
            .sort((a: any, b: any) => a.order - b.order);
          
          setCmsPages(pages);
          return;
        }
      } catch (error) {
        console.error('Error loading pages from API:', error);
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem('cms_pages');
      if (saved) {
        const pages: CMSPage[] = JSON.parse(saved);
        const publishedPages = pages
          .filter((p) => p.status === 'published' && p.showInHeader)
          .sort((a, b) => a.order - b.order);
        setCmsPages(publishedPages);
      }
    };

    loadPages();

    // تحديث كل 5 ثوانٍ
    const interval = setInterval(loadPages, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // الصفحات الأساسية (الثابتة)
  const baseNavigation = [
    { name: 'الرئيسية', href: '/' },
  ];

  // الصفحات الرئيسية (بدون parent) من CMS
  const mainPages = cmsPages.filter((p) => !p.parentId);

  // الصفحات الفرعية (لها parent)
  const childPages = cmsPages.filter((p) => p.parentId);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* News Ticker */}
      <NewsTicker />

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="معهد سيناء العالي للدراسات النوعية"
              width={300}
              height={90}
              quality={100}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* الصفحة الرئيسية */}
            {baseNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
            
            {/* الصفحات الرئيسية من CMS */}
            {mainPages.map((page) => {
              const children = childPages.filter((c) => c.parentId === page.id);
              
              // إذا كان لها صفحات فرعية، اعرضها كقائمة منسدلة
              if (children.length > 0) {
                return (
                  <DropdownMenu key={page.id}>
                    <DropdownMenuTrigger asChild>
                      <button className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                        {page.title}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* الصفحة الأساسية */}
                      <DropdownMenuItem asChild>
                        <Link href={`/${page.slug}`} prefetch={false} className="cursor-pointer">
                          {page.title}
                        </Link>
                      </DropdownMenuItem>
                      {/* الصفحات الفرعية */}
                      {children.map((child) => (
                        <DropdownMenuItem key={child.id} asChild>
                          <Link href={`/${child.slug}`} prefetch={false} className="cursor-pointer">
                            {child.title}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              // إذا لم يكن لها صفحات فرعية، اعرضها كرابط عادي
              return (
                <Link
                  key={page.id}
                  href={`/${page.slug}`}
                  prefetch={false}
                  className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  {page.title}
                </Link>
              );
            })}
          </nav>

          {/* Contact & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span dir="ltr">+201220822224</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>info@sainaiinstitute.com</span>
              </div>
            </div>
            
            <Link href="/complaints">
              <Button size="sm" variant="outline">
                <MessageSquare className="h-4 w-4 ml-2" />
                الشكاوى
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {/* الصفحة الرئيسية */}
            {baseNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 hover:bg-muted rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {/* الصفحات من CMS */}
            {mainPages.map((page) => {
              const children = childPages.filter((c) => c.parentId === page.id);
              
              return (
                <div key={page.id}>
                  <Link
                    href={`/${page.slug}`}
                    prefetch={false}
                    className="px-4 py-2 hover:bg-muted rounded-md flex items-center justify-between font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {page.title}
                    {children.length > 0 && <ChevronDown className="h-4 w-4" />}
                  </Link>
                  {/* الصفحات الفرعية */}
                  {children.length > 0 && (
                    <div className="pr-4">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/${child.slug}`}
                          prefetch={false}
                          className="px-4 py-2 hover:bg-muted rounded-md block text-sm text-muted-foreground"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          • {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            <Link
              href="/complaints"
              className="px-4 py-2 hover:bg-muted rounded-md text-primary font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              الشكاوى
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
