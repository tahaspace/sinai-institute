'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';

interface NewsItem {
  id: string;
  text: string;
  link: string;
}

export default function NewsTicker() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('homepage_news');
    if (saved) {
      setNewsItems(JSON.parse(saved));
    } else {
      // Default news
      setNewsItems([
        {
          id: '1',
          text: 'بدء التسجيل للفصل الدراسي الجديد - آخر موعد 15 فبراير 2026',
          link: '/admission',
        },
      ]);
    }
  }, []);

  if (newsItems.length === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Megaphone className="h-5 w-5" />
            <span className="font-bold">أخبار المعهد:</span>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap flex gap-8">
              {newsItems.map((news, index) => (
                <span key={`${news.id}-${index}`} className="inline-flex items-center gap-2">
                  {news.link ? (
                    <Link
                      href={news.link}
                      className="hover:underline"
                    >
                      {news.text}
                    </Link>
                  ) : (
                    <span>{news.text}</span>
                  )}
                  {index < newsItems.length - 1 && (
                    <span className="text-primary-foreground/50">•</span>
                  )}
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {newsItems.map((news, index) => (
                <span key={`${news.id}-dup-${index}`} className="inline-flex items-center gap-2">
                  {news.link ? (
                    <Link
                      href={news.link}
                      className="hover:underline"
                    >
                      {news.text}
                    </Link>
                  ) : (
                    <span>{news.text}</span>
                  )}
                  {index < newsItems.length - 1 && (
                    <span className="text-primary-foreground/50">•</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
