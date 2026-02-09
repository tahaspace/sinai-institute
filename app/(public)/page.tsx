'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

// Default slides (will be replaced by localStorage data if available)
const defaultSlides = [
  {
    id: '1',
    title: 'مرحباً بكم في معهد سيناء العالي',
    subtitle: 'للدراسات النوعية',
    description: 'التعليم المتميز هو طريقنا للمستقبل',
    buttonText: 'التقديم الآن',
    buttonLink: 'http://localhost:3001/apply',
    imageUrl: '',
    order: 1,
  },
];

// Default departments (will be replaced by localStorage data if available)
const defaultDepartments = [
  { id: '1', name: 'إدارة ضيافة', icon: '🏨', students: 450, nameEn: 'Hospitality Management', description: '', detailsLink: '/departments', isVisible: true },
  { id: '2', name: 'إرشاد سياحي', icon: '🗺️', students: 320, nameEn: 'Tour Guidance', description: '', detailsLink: '/departments', isVisible: true },
  { id: '3', name: 'دراسات سياحية', icon: '✈️', students: 380, nameEn: 'Tourism Studies', description: '', detailsLink: '/departments', isVisible: true },
  { id: '4', name: 'إنجليزي', icon: '🇬🇧', students: 290, nameEn: 'English Language', description: '', detailsLink: '/departments', isVisible: true },
  { id: '5', name: 'فرنسي', icon: '🇫🇷', students: 210, nameEn: 'French Language', description: '', detailsLink: '/departments', isVisible: true },
  { id: '6', name: 'علوم إدارية', icon: '📊', students: 340, nameEn: 'Administrative Sciences', description: '', detailsLink: '/departments', isVisible: true },
];

// Default stats (will be replaced by localStorage data if available)
const defaultStats = {
  students: 1990,
  departments: 6,
  faculty: 85,
  graduates: 5000,
};

// Default institute news (will be replaced by localStorage data if available)
const defaultInstituteNews = [
  {
    id: '1',
    title: 'معهد سيناء العالي للدراسات النوعية',
    description: 'مؤسسة تعليمية رائدة في مجال التعليم العالي، نقدم برامج أكاديمية متميزة في 6 تخصصات مختلفة. نهدف إلى إعداد خريجين مؤهلين للمنافسة في سوق العمل المحلي والدولي.',
    points: [
      'اعتماد أكاديمي من وزارة التعليم العالي',
      'هيئة تدريس متميزة',
      'مرافق حديثة ومجهزة',
    ],
    buttonText: 'اقرأ المزيد',
    buttonLink: '/about',
    imageUrl: '',
    order: 1,
  },
];

// Default general news (will be replaced by localStorage data if available)
const defaultGeneralNews = [
  {
    id: '1',
    title: 'فعاليات وأنشطة المعهد',
    description: 'نظم المعهد مجموعة متميزة من الفعاليات والأنشطة الطلابية التي تهدف إلى تطوير مهارات الطلاب وصقل مواهبهم في مختلف المجالات.',
    media: [
      {
        id: 'm1',
        type: 'image' as const,
        url: '',
        caption: 'فعاليات المعهد',
      },
    ],
    buttonText: 'اعرف المزيد',
    buttonLink: '/activities',
    order: 1,
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(defaultSlides);
  const [stats, setStats] = useState(defaultStats);
  const [instituteNews, setInstituteNews] = useState(defaultInstituteNews);
  const [departments, setDepartments] = useState(defaultDepartments);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [generalNews, setGeneralNews] = useState(defaultGeneralNews);
  const [currentGeneralNewsIndex, setCurrentGeneralNewsIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<{ [key: string]: number }>({});

  // Load data from localStorage
  useEffect(() => {
    const savedSlides = localStorage.getItem('homepage_slides');
    const savedStats = localStorage.getItem('homepage_stats');
    const savedInstituteNews = localStorage.getItem('homepage_institute_news');
    const savedSpecializations = localStorage.getItem('homepage_specializations');
    
    if (savedSlides) {
      const slides = JSON.parse(savedSlides);
      setHeroSlides(slides.sort((a: any, b: any) => a.order - b.order));
    }
    
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
    
    if (savedInstituteNews) {
      const news = JSON.parse(savedInstituteNews);
      setInstituteNews(news.sort((a: any, b: any) => a.order - b.order));
    }

    if (savedSpecializations) {
      const specs = JSON.parse(savedSpecializations);
      // Filter only visible specializations and sort by order
      const visibleSpecs = specs
        .filter((s: any) => s.isVisible)
        .sort((a: any, b: any) => a.order - b.order)
        .map((s: any) => ({
          id: s.id,
          name: s.nameAr,
          nameEn: s.nameEn,
          icon: s.icon,
          students: s.students,
          description: s.description || '',
          detailsLink: s.detailsLink || '/departments',
          isVisible: s.isVisible,
        }));
      if (visibleSpecs.length > 0) {
        setDepartments(visibleSpecs);
      }
    }

    const savedGeneralNews = localStorage.getItem('homepage_general_news');
    if (savedGeneralNews) {
      const news = JSON.parse(savedGeneralNews);
      console.log('📰 General News loaded from localStorage:', news);
      setGeneralNews(news.sort((a: any, b: any) => a.order - b.order));
    } else {
      console.log('⚠️ No general news found in localStorage');
    }
  }, []);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <div className="pt-32">
      {/* Hero Slider */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4">
          {heroSlides.map((slide, index) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: currentSlide === index ? 1 : 0,
                scale: currentSlide === index ? 1 : 1.05,
              }}
              transition={{ duration: 0.7 }}
              className={`${currentSlide === index ? 'relative' : 'absolute inset-0'}`}
            >
              {/* Hero Container with Limited Width */}
              <div className="max-w-6xl mx-auto">
                <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
                  {/* Background Image */}
                  {slide.imageUrl ? (
                    <>
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        className="object-cover"
                        priority
                      />
                      {/* Gradient overlay for better text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
                    </>
                  ) : (
                    // Fallback gradient background if no image
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
                  )}
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{
                        y: currentSlide === index ? 0 : 30,
                        opacity: currentSlide === index ? 1 : 0,
                      }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="text-center max-w-4xl"
                    >
                      {slide.subtitle && (
                        <Badge className="mb-4 text-base md:text-lg px-4 py-1.5 shadow-lg">
                          {slide.subtitle}
                        </Badge>
                      )}
                      <h1 
                        className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 ${
                          slide.imageUrl 
                            ? 'text-white drop-shadow-2xl' 
                            : 'text-foreground'
                        }`}
                      >
                        {slide.title}
                      </h1>
                      {slide.description && (
                        <p 
                          className={`text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 ${
                            slide.imageUrl 
                              ? 'text-white/95 drop-shadow-lg' 
                              : 'text-muted-foreground'
                          }`}
                        >
                          {slide.description}
                        </p>
                      )}
                      {slide.buttonText && slide.buttonLink && (
                        <Link href={slide.buttonLink}>
                          <Button size="lg" className="text-base md:text-lg px-6 md:px-8 shadow-xl hover:shadow-2xl transition-all">
                            {slide.buttonText}
                            <ArrowRight className="mr-2 h-5 w-5" />
                          </Button>
                        </Link>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Slider Controls */}
        {heroSlides.length > 1 && (
          <div className="max-w-6xl mx-auto px-4">
            <div className="relative -mt-8 flex items-center justify-center gap-4 z-20">
              <button
                onClick={prevSlide}
                className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all"
                aria-label="الشريحة السابقة"
              >
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
              <div className="flex gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      currentSlide === index 
                        ? 'w-8 bg-primary' 
                        : 'w-2.5 bg-muted hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`الذهاب إلى الشريحة ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all"
                aria-label="الشريحة التالية"
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <div className="text-4xl font-bold mb-2">{stats.students}+</div>
              <div className="text-muted-foreground">طالب وطالبة</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
              <div className="text-4xl font-bold mb-2">{stats.departments}</div>
              <div className="text-muted-foreground">تخصص أكاديمي</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
              <div className="text-4xl font-bold mb-2">{stats.faculty}+</div>
              <div className="text-muted-foreground">عضو هيئة تدريس</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
              <div className="text-4xl font-bold mb-2">{stats.graduates}+</div>
              <div className="text-muted-foreground">خريج ناجح</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Institute News Carousel */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="mb-4">أخبار عن المعهد</Badge>
          </div>
          
          {instituteNews.length > 0 && (
            <div className="relative">
              {/* News Item */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div
                  key={instituteNews[currentNewsIndex].id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="text-4xl font-bold mb-6">
                    {instituteNews[currentNewsIndex].title}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    {instituteNews[currentNewsIndex].description}
                  </p>
                  {instituteNews[currentNewsIndex].points && 
                   instituteNews[currentNewsIndex].points.length > 0 && (
                    <ul className="space-y-3 mb-8">
                      {instituteNews[currentNewsIndex].points.map((point: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {instituteNews[currentNewsIndex].buttonText && 
                   instituteNews[currentNewsIndex].buttonLink && (
                    <Link href={instituteNews[currentNewsIndex].buttonLink}>
                      <Button size="lg">
                        {instituteNews[currentNewsIndex].buttonText}
                        <ArrowRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </motion.div>
                
                <motion.div
                  key={`img-${instituteNews[currentNewsIndex].id}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20"
                >
                  {instituteNews[currentNewsIndex].imageUrl ? (
                    <Image
                      src={instituteNews[currentNewsIndex].imageUrl}
                      alt={instituteNews[currentNewsIndex].title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GraduationCap className="h-32 w-32 text-primary/40" />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Navigation Controls */}
              {instituteNews.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() =>
                      setCurrentNewsIndex(
                        (prev) =>
                          (prev - 1 + instituteNews.length) % instituteNews.length
                      )
                    }
                    className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    aria-label="الخبر السابق"
                  >
                    <ChevronRight className="h-6 w-6 text-primary" />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {currentNewsIndex + 1} / {instituteNews.length}
                    </span>
                  </div>
                  
                  <button
                    onClick={() =>
                      setCurrentNewsIndex(
                        (prev) => (prev + 1) % instituteNews.length
                      )
                    }
                    className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    aria-label="الخبر التالي"
                  >
                    <ChevronLeft className="h-6 w-6 text-primary" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* General News Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 text-lg px-6 py-2">أخبار</Badge>
              <h2 className="text-4xl font-bold mb-4">آخر الأخبار والفعاليات</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                تابع أحدث الأخبار والفعاليات في المعهد
              </p>
            </motion.div>
          </div>

          {generalNews.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {generalNews.map((news: any, index: number) => {
                console.log(`📰 Rendering news ${index + 1}:`, news);
                console.log(`   - Media count: ${news.media?.length || 0}`);
                if (news.media && news.media.length > 0) {
                  news.media.forEach((m: any, i: number) => {
                    console.log(`   - Media ${i + 1}: ${m.type} - ${m.url}`);
                  });
                }
                return (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                    {/* Media Gallery */}
                    {news.media && news.media.length > 0 && (
                      <div className="relative h-64 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                        {(() => {
                          const currentMedia = news.media[currentMediaIndex[news.id] || 0];
                          
                          if (!currentMedia) {
                            return (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-20 w-20 text-primary/30" />
                              </div>
                            );
                          }

                          // YouTube/Vimeo detection
                          const isYouTube = currentMedia.url?.includes('youtube.com') || currentMedia.url?.includes('youtu.be');
                          const isVimeo = currentMedia.url?.includes('vimeo.com');
                          
                          if (currentMedia.type === 'video' || isYouTube || isVimeo) {
                            let embedUrl = currentMedia.url;
                            
                            if (isYouTube) {
                              const videoId = currentMedia.url.includes('youtu.be') 
                                ? currentMedia.url.split('youtu.be/')[1]?.split('?')[0]
                                : currentMedia.url.split('v=')[1]?.split('&')[0];
                              embedUrl = `https://www.youtube.com/embed/${videoId}`;
                            } else if (isVimeo) {
                              const videoId = currentMedia.url.split('vimeo.com/')[1]?.split('?')[0];
                              embedUrl = `https://player.vimeo.com/video/${videoId}`;
                            }

                            return (
                              <iframe
                                src={embedUrl}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            );
                          }

                          // Regular image
                          return currentMedia.url ? (
                            <Image
                              src={currentMedia.url}
                              alt={currentMedia.caption || news.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="h-20 w-20 text-primary/30" />
                            </div>
                          );
                        })()}

                        {/* Gallery Navigation */}
                        {news.media.length > 1 && (
                          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-10">
                            <button
                              onClick={() => {
                                setCurrentMediaIndex(prev => ({
                                  ...prev,
                                  [news.id]: ((prev[news.id] || 0) - 1 + news.media.length) % news.media.length
                                }));
                              }}
                              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all"
                              aria-label="السابق"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            
                            <div className="flex gap-1">
                              {news.media.map((_: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setCurrentMediaIndex(prev => ({
                                      ...prev,
                                      [news.id]: idx
                                    }));
                                  }}
                                  className={`h-2 rounded-full transition-all ${
                                    (currentMediaIndex[news.id] || 0) === idx
                                      ? 'w-8 bg-white'
                                      : 'w-2 bg-white/50'
                                  }`}
                                  aria-label={`انتقل إلى الصورة ${idx + 1}`}
                                />
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                setCurrentMediaIndex(prev => ({
                                  ...prev,
                                  [news.id]: ((prev[news.id] || 0) + 1) % news.media.length
                                }));
                              }}
                              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all"
                              aria-label="التالي"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Media Type Badge */}
                        <div className="absolute top-4 right-4 z-10">
                          <Badge variant="secondary" className="bg-black/60 text-white border-0">
                            {news.media[currentMediaIndex[news.id] || 0]?.type === 'video' ? 'فيديو' : 'صورة'}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                        {news.title}
                      </h3>
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {news.description}
                      </p>
                      
                      {news.buttonText && news.buttonLink && (
                        <Link href={news.buttonLink}>
                          <Button variant="outline" className="w-full group/btn">
                            {news.buttonText}
                            <ArrowRight className="mr-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا توجد أخبار حالياً</p>
              <p className="text-sm text-muted-foreground mt-2">
                يمكنك إضافة أخبار من لوحة الإدارة
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Departments */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4">الأقسام الأكاديمية</Badge>
            <h2 className="text-4xl font-bold mb-4">اختر تخصصك</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              6 تخصصات أكاديمية متميزة تلبي احتياجات سوق العمل
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                      {dept.icon}
                    </div>
                    <CardTitle className="text-xl">{dept.name}</CardTitle>
                    <CardDescription>{dept.nameEn}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {dept.students} طالب
                      </span>
                      <Link href={dept.detailsLink || '/departments'}>
                        <Button variant="ghost" size="sm">
                          التفاصيل
                          <ArrowRight className="mr-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/departments">
              <Button size="lg" variant="outline">
                عرض جميع الأقسام
                <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">ابدأ مستقبلك معنا</h2>
              <p className="text-xl mb-8 opacity-90">
                قدم الآن والتحق بأحد تخصصاتنا المتميزة
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/apply">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    التقديم أونلاين
                    <ArrowRight className="mr-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="text-lg px-8 text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    اتصل بنا
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
