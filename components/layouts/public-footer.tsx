'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';

interface SocialMediaLink {
  id: string;
  name: string;
  icon: string;
  url: string;
  order: number;
  isVisible: boolean;
}

// Default social media links
const defaultSocialLinks: SocialMediaLink[] = [
  {
    id: '1',
    name: 'Facebook',
    icon: 'Facebook',
    url: 'https://www.facebook.com/sinaiinistitute',
    order: 1,
    isVisible: true,
  },
];

export default function PublicFooter() {
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>(defaultSocialLinks);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedSocialLinks = localStorage.getItem('homepage_social_media');
    if (savedSocialLinks) {
      setSocialLinks(JSON.parse(savedSocialLinks));
    }
  }, []);

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Facebook,
      Twitter,
      Instagram,
      Linkedin,
      Youtube,
    };
    return icons[iconName] || Facebook;
  };

  // Only show visible social links
  const visibleSocialLinks = socialLinks.filter(link => link.isVisible);

  return (
    <footer className="bg-muted/30 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4">عن المعهد</h3>
            <p className="text-sm text-muted-foreground mb-4">
              معهد سيناء العالي للدراسات النوعية - مؤسسة تعليمية رائدة في مجال التعليم العالي
            </p>
            {isMounted && visibleSocialLinks.length > 0 && (
              <div className="flex gap-4">
                {visibleSocialLinks.map((social) => {
                  const IconComponent = getIconComponent(social.icon);
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      title={social.name}
                    >
                      <IconComponent className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  عن المعهد
                </Link>
              </li>
              <li>
                <Link href="/admission" className="hover:text-primary transition-colors">
                  التسجيل والالتحاق
                </Link>
              </li>
              <li>
                <Link href="/departments" className="hover:text-primary transition-colors">
                  الأقسام
                </Link>
              </li>
              <li>
                <Link href="/apply" className="hover:text-primary transition-colors">
                  التقديم أونلاين
                </Link>
              </li>
            </ul>
          </div>

          {/* Students */}
          <div>
            <h3 className="font-bold text-lg mb-4">للطلاب</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/results" className="hover:text-primary transition-colors">
                  النتائج
                </Link>
              </li>
              <li>
                <Link href="/schedules" className="hover:text-primary transition-colors">
                  جداول المحاضرات
                </Link>
              </li>
              <li>
                <Link href="/complaints" className="hover:text-primary transition-colors">
                  الشكاوى
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">اتصل بنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>المدينة التعليمية بالإسماعيلية</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span dir="ltr">+201220822224</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>info@sainaiinstitute.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              © 2026 معهد سيناء العالي للدراسات النوعية. جميع الحقوق محفوظة.
            </div>
            <div>
              Powered by{' '}
              <a
                href="mailto:info@sictb.com"
                className="hover:text-primary transition-colors font-medium"
              >
                Smart Innovation
              </a>
              : info@sictb.com
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
