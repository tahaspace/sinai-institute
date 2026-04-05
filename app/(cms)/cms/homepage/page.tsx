'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Image as ImageIcon, BarChart3, Megaphone, Save, MoveUp, MoveDown, Edit2, GraduationCap, Eye, EyeOff, Facebook } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  order: number;
}

interface Stats {
  students: number;
  departments: number;
  faculty: number;
  graduates: number;
}

interface NewsItem {
  id: string;
  text: string;
  link: string;
  order: number;
}

interface InstituteNews {
  id: string;
  title: string;
  description: string;
  points: string[];
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  order: number;
}

interface Specialization {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  students: number;
  description: string;
  detailsLink: string;
  order: number;
  isVisible: boolean;
}

interface SocialMediaLink {
  id: string;
  name: string;
  icon: string;
  url: string;
  order: number;
  isVisible: boolean;
}

interface GeneralNewsMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
}

interface GeneralNews {
  id: string;
  title: string;
  description: string;
  media: GeneralNewsMedia[];
  buttonText: string;
  buttonLink: string;
  order: number;
}

export default function HomepageManagementPage() {
  const [isMounted, setIsMounted] = useState(false);

  // Default values
  const defaultSlides: Slide[] = [
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

  const defaultStats: Stats = {
    students: 1990,
    departments: 6,
    faculty: 85,
    graduates: 5000,
  };

  const defaultNewsItems: NewsItem[] = [
    {
      id: '1',
      text: 'بدء التسجيل للفصل الدراسي الجديد - آخر موعد 15 فبراير 2026',
      link: '/admission',
      order: 1,
    },
  ];

  const defaultInstituteNews: InstituteNews[] = [
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

  const defaultSpecializations: Specialization[] = [
    { id: '1', nameAr: 'إدارة ضيافة', nameEn: 'Hospitality Management', icon: '🏨', students: 450, description: 'برنامج متميز في إدارة الفنادق والضيافة', detailsLink: '/departments', order: 1, isVisible: true },
    { id: '2', nameAr: 'إرشاد سياحي', nameEn: 'Tour Guidance', icon: '🗺️', students: 320, description: 'تأهيل مرشدين سياحيين محترفين', detailsLink: '/departments', order: 2, isVisible: true },
    { id: '3', nameAr: 'دراسات سياحية', nameEn: 'Tourism Studies', icon: '✈️', students: 380, description: 'دراسة شاملة لصناعة السياحة', detailsLink: '/departments', order: 3, isVisible: true },
    { id: '4', nameAr: 'إنجليزي', nameEn: 'English Language', icon: '🇬🇧', students: 290, description: 'برنامج اللغة الإنجليزية وآدابها', detailsLink: '/departments', order: 4, isVisible: true },
    { id: '5', nameAr: 'فرنسي', nameEn: 'French Language', icon: '🇫🇷', students: 210, description: 'برنامج اللغة الفرنسية وآدابها', detailsLink: '/departments', order: 5, isVisible: true },
    { id: '6', nameAr: 'علوم إدارية', nameEn: 'Administrative Sciences', icon: '📊', students: 340, description: 'تخصص العلوم الإدارية وإدارة الأعمال', detailsLink: '/departments', order: 6, isVisible: true },
  ];

  const defaultSocialMediaLinks: SocialMediaLink[] = [
    { id: '1', name: 'Facebook', icon: 'Facebook', url: 'https://www.facebook.com/sinaiinistitute', order: 1, isVisible: true },
  ];

  const defaultGeneralNews: GeneralNews[] = [
    {
      id: '1',
      title: 'فعاليات وأنشطة المعهد',
      description: 'نظم المعهد مجموعة متميزة من الفعاليات والأنشطة الطلابية التي تهدف إلى تطوير مهارات الطلاب وصقل مواهبهم في مختلف المجالات.',
      media: [
        {
          id: 'm1',
          type: 'image',
          url: '',
          caption: 'فعاليات المعهد',
        },
      ],
      buttonText: 'اعرف المزيد',
      buttonLink: '/activities',
      order: 1,
    },
  ];

  const [slides, setSlides] = useState<Slide[]>(defaultSlides);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(defaultNewsItems);
  const [instituteNews, setInstituteNews] = useState<InstituteNews[]>(defaultInstituteNews);
  const [specializations, setSpecializations] = useState<Specialization[]>(defaultSpecializations);
  const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMediaLink[]>(defaultSocialMediaLinks);
  const [generalNews, setGeneralNews] = useState<GeneralNews[]>(defaultGeneralNews);

  // Load from localStorage after mount
  useEffect(() => {
    setIsMounted(true);
    
    const savedSlides = localStorage.getItem('homepage_slides');
    if (savedSlides) {
      setSlides(JSON.parse(savedSlides));
    }

    const savedStats = localStorage.getItem('homepage_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }

    const savedNews = localStorage.getItem('homepage_news');
    if (savedNews) {
      setNewsItems(JSON.parse(savedNews));
    }

    fetch('/api/news?category=INSTITUTE_NEWS')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInstituteNews(data.map((n: any) => ({
            id: n.id,
            title: n.titleAr,
            description: n.contentAr,
            points: [],
            buttonText: 'اقرأ المزيد',
            buttonLink: `/news/${n.id}`,
            imageUrl: n.image || '',
            order: n.order || 0
          })));
        }
      }).catch(console.error);

    const savedSpecializations = localStorage.getItem('homepage_specializations');
    if (savedSpecializations) {
      setSpecializations(JSON.parse(savedSpecializations));
    }

    const savedSocialMedia = localStorage.getItem('homepage_social_media');
    if (savedSocialMedia) {
      setSocialMediaLinks(JSON.parse(savedSocialMedia));
    }

    fetch('/api/news?category=GENERAL_NEWS')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGeneralNews(data.map((n: any) => ({
            id: n.id,
            title: n.titleAr,
            description: n.contentAr,
            media: n.image ? [{ id: 'm1', type: 'image', url: n.image, caption: n.titleAr }] : [],
            buttonText: 'اعرف المزيد',
            buttonLink: `/news/${n.id}`,
            order: n.order || 0
          })));
        }
      }).catch(console.error);
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('homepage_slides', JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('homepage_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('homepage_news', JSON.stringify(newsItems));
  }, [newsItems]);

  // removed instituteNews localStorage persistence

  useEffect(() => {
    localStorage.setItem('homepage_specializations', JSON.stringify(specializations));
  }, [specializations]);

  useEffect(() => {
    localStorage.setItem('homepage_social_media', JSON.stringify(socialMediaLinks));
  }, [socialMediaLinks]);

  // removed generalNews localStorage persistence

  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonLink: '',
  });

  const [newNews, setNewNews] = useState({
    text: '',
    link: '',
  });

  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  const [newInstituteNews, setNewInstituteNews] = useState({
    title: '',
    description: '',
    points: [''],
    buttonText: '',
    buttonLink: '',
    imageUrl: '',
  });

  const [editingInstituteNewsId, setEditingInstituteNewsId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Specializations States
  const [newSpecialization, setNewSpecialization] = useState({
    nameAr: '',
    nameEn: '',
    icon: '',
    students: 0,
    description: '',
    detailsLink: '/departments',
  });
  const [editingSpecializationId, setEditingSpecializationId] = useState<string | null>(null);
  
  // Social Media States
  const [newSocialMedia, setNewSocialMedia] = useState({
    name: '',
    icon: 'Facebook',
    url: '',
  });
  const [editingSocialMediaId, setEditingSocialMediaId] = useState<string | null>(null);
  
  // General News States
  const [newGeneralNews, setNewGeneralNews] = useState({
    title: '',
    description: '',
    media: [] as GeneralNewsMedia[],
    buttonText: '',
    buttonLink: '',
  });
  const [editingGeneralNewsId, setEditingGeneralNewsId] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaCaption, setMediaCaption] = useState<string>('');
  
  // Hero Slider Image Upload States
  const [isUploadingSliderImage, setIsUploadingSliderImage] = useState(false);
  const [uploadedSliderImagePreview, setUploadedSliderImagePreview] = useState<string | null>(null);
  const [sliderImageUrl, setSliderImageUrl] = useState<string>('');

  const handleAddSlide = () => {
    if (!newSlide.title) {
      toast.error('يرجى إدخال العنوان');
      return;
    }

    const slide: Slide = {
      id: Date.now().toString(),
      ...newSlide,
      imageUrl: sliderImageUrl,
      order: slides.length + 1,
    };

    setSlides([...slides, slide]);
    setNewSlide({ title: '', subtitle: '', description: '', buttonText: '', buttonLink: '' });
    setSliderImageUrl('');
    setUploadedSliderImagePreview(null);
    toast.success('تمت إضافة الشريحة');
  };

  const handleDeleteSlide = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشريحة؟')) return;
    setSlides(slides.filter(s => s.id !== id));
    toast.success('تم الحذف');
  };

  const handleMoveSlide = (id: string, direction: 'up' | 'down') => {
    const index = slides.findIndex(s => s.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const newSlides = [...slides];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    
    newSlides.forEach((slide, i) => {
      slide.order = i + 1;
    });

    setSlides(newSlides);
  };

  const handleAddNews = () => {
    if (!newNews.text) {
      toast.error('يرجى إدخال نص الخبر');
      return;
    }

    if (editingNewsId) {
      // Update existing news
      setNewsItems(newsItems.map(n => 
        n.id === editingNewsId 
          ? { ...n, text: newNews.text, link: newNews.link }
          : n
      ));
      setEditingNewsId(null);
      toast.success('تم تحديث الخبر');
    } else {
      // Add new news
      const news: NewsItem = {
        id: Date.now().toString(),
        ...newNews,
        order: newsItems.length + 1,
      };
      setNewsItems([...newsItems, news]);
      toast.success('تمت إضافة الخبر');
    }

    setNewNews({ text: '', link: '' });
  };

  const handleDeleteNews = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    setNewsItems(newsItems.filter(n => n.id !== id));
    // Clear editing state if we're deleting the item being edited
    if (editingNewsId === id) {
      setEditingNewsId(null);
      setNewNews({ text: '', link: '' });
    }
    toast.success('تم الحذف');
  };

  const handleEditNews = (news: NewsItem) => {
    setNewNews({ text: news.text, link: news.link });
    setEditingNewsId(news.id);
    toast('جاهز للتعديل - عدّل ثم اضغط حفظ');
  };

  const handleCancelEditNews = () => {
    setNewNews({ text: '', link: '' });
    setEditingNewsId(null);
    toast('تم إلغاء التعديل');
  };

  const handleAddInstituteNews = async () => {
    if (!newInstituteNews.title) {
      toast.error('يرجى إدخال العنوان');
      return;
    }

    const isUpdate = !!editingInstituteNewsId;
    const method = isUpdate ? 'PUT' : 'POST';
    const body = {
      ...(isUpdate ? { id: editingInstituteNewsId } : {}),
      title: newInstituteNews.title,
      content: newInstituteNews.description,
      image: newInstituteNews.imageUrl,
      category: 'INSTITUTE_NEWS',
      published: true
    };

    try {
      const res = await fetch('/api/news', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      if (isUpdate) {
        setInstituteNews(
          instituteNews.map((n) =>
            n.id === editingInstituteNewsId
              ? {
                  ...n,
                  title: newInstituteNews.title,
                  description: newInstituteNews.description,
                  points: newInstituteNews.points.filter((p) => p.trim() !== ''),
                  buttonText: newInstituteNews.buttonText,
                  buttonLink: newInstituteNews.buttonLink,
                  imageUrl: newInstituteNews.imageUrl,
                }
              : n
          )
        );
        toast.success('تم تحديث الخبر بنجاح');
      } else {
        const news: InstituteNews = {
          id: data.id,
          title: newInstituteNews.title,
          description: newInstituteNews.description,
          points: newInstituteNews.points.filter((p) => p.trim() !== ''),
          buttonText: newInstituteNews.buttonText,
          buttonLink: newInstituteNews.buttonLink,
          imageUrl: newInstituteNews.imageUrl,
          order: instituteNews.length + 1,
        };
        setInstituteNews([news, ...instituteNews]);
        toast.success('تمت إضافة الخبر بنجاح');
      }
      setEditingInstituteNewsId(null);
      setNewInstituteNews({ title: '', description: '', points: [''], buttonText: '', buttonLink: '', imageUrl: '' });
      setUploadedImagePreview(null);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteInstituteNews = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    try {
      const res = await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setInstituteNews(instituteNews.filter((n) => n.id !== id));
      if (editingInstituteNewsId === id) {
        setEditingInstituteNewsId(null);
        setNewInstituteNews({ title: '', description: '', points: [''], buttonText: '', buttonLink: '', imageUrl: '' });
        setUploadedImagePreview(null);
      }
      toast.success('تم الحذف');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleEditInstituteNews = (news: InstituteNews) => {
    setNewInstituteNews({
      title: news.title,
      description: news.description,
      points: news.points.length > 0 ? news.points : [''],
      buttonText: news.buttonText,
      buttonLink: news.buttonLink,
      imageUrl: news.imageUrl || '',
    });
    setEditingInstituteNewsId(news.id);
    setUploadedImagePreview(news.imageUrl || null);
    toast('جاهز للتعديل - عدّل ثم اضغط حفظ');
  };

  const handleCancelEditInstituteNews = () => {
    setNewInstituteNews({ title: '', description: '', points: [''], buttonText: '', buttonLink: '', imageUrl: '' });
    setUploadedImagePreview(null);
    setEditingInstituteNewsId(null);
    setUploadedImagePreview(null);
    toast('تم إلغاء التعديل');
  };

  const handleMoveInstituteNews = (id: string, direction: 'up' | 'down') => {
    const index = instituteNews.findIndex((n) => n.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === instituteNews.length - 1) return;

    const newNews = [...instituteNews];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newNews[index], newNews[newIndex]] = [newNews[newIndex], newNews[index]];

    newNews.forEach((news, i) => {
      news.order = i + 1;
    });

    setInstituteNews(newNews);
  };

  const handleAddPoint = () => {
    setNewInstituteNews({
      ...newInstituteNews,
      points: [...newInstituteNews.points, ''],
    });
  };

  const handleRemovePoint = (index: number) => {
    setNewInstituteNews({
      ...newInstituteNews,
      points: newInstituteNews.points.filter((_, i) => i !== index),
    });
  };

  const handleUpdatePoint = (index: number, value: string) => {
    const newPoints = [...newInstituteNews.points];
    newPoints[index] = value;
    setNewInstituteNews({
      ...newInstituteNews,
      points: newPoints,
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. يُسمح فقط بـ: JPG, PNG, WebP, GIF');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى: 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل رفع الصورة');
      }

      // Update imageUrl in state
      setNewInstituteNews({
        ...newInstituteNews,
        imageUrl: data.imageUrl,
      });

      toast.success('تم رفع الصورة بنجاح!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الصورة');
      setUploadedImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setNewInstituteNews({
      ...newInstituteNews,
      imageUrl: '',
    });
    setUploadedImagePreview(null);
    toast('تمت إزالة الصورة');
  };

  // Hero Slider Image Upload Handler
  const handleSliderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. يُسمح فقط بـ: JPG, PNG, WebP, GIF');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى: 5MB');
      return;
    }

    setIsUploadingSliderImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSliderImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل رفع الصورة');
      }

      // Update imageUrl in state
      setSliderImageUrl(data.imageUrl);

      toast.success('تم رفع الصورة بنجاح!');
    } catch (error) {
      console.error('Error uploading slider image:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الصورة');
      setUploadedSliderImagePreview(null);
    } finally {
      setIsUploadingSliderImage(false);
    }
  };

  const handleRemoveSliderImage = () => {
    setSliderImageUrl('');
    setUploadedSliderImagePreview(null);
    toast('تمت إزالة الصورة');
  };

  // Specializations Handlers
  const handleAddSpecialization = () => {
    if (!newSpecialization.nameAr || !newSpecialization.nameEn) {
      toast.error('يرجى إدخال اسم التخصص بالعربي والإنجليزي');
      return;
    }

    if (editingSpecializationId) {
      // Update existing
      setSpecializations(
        specializations.map((s) =>
          s.id === editingSpecializationId
            ? {
                ...s,
                nameAr: newSpecialization.nameAr,
                nameEn: newSpecialization.nameEn,
                icon: newSpecialization.icon,
                students: newSpecialization.students,
                description: newSpecialization.description,
                detailsLink: newSpecialization.detailsLink,
              }
            : s
        )
      );
      setEditingSpecializationId(null);
      toast.success('تم تحديث التخصص');
    } else {
      // Add new
      const spec: Specialization = {
        id: Date.now().toString(),
        nameAr: newSpecialization.nameAr,
        nameEn: newSpecialization.nameEn,
        icon: newSpecialization.icon,
        students: newSpecialization.students,
        description: newSpecialization.description,
        detailsLink: newSpecialization.detailsLink,
        order: specializations.length + 1,
        isVisible: true,
      };
      setSpecializations([...specializations, spec]);
      toast.success('تمت إضافة التخصص');
    }

    setNewSpecialization({ nameAr: '', nameEn: '', icon: '', students: 0, description: '', detailsLink: '/departments' });
  };

  const handleDeleteSpecialization = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التخصص؟')) return;
    setSpecializations(specializations.filter((s) => s.id !== id));
    if (editingSpecializationId === id) {
      setEditingSpecializationId(null);
      setNewSpecialization({ nameAr: '', nameEn: '', icon: '', students: 0, description: '', detailsLink: '/departments' });
    }
    toast.success('تم الحذف');
  };

  const handleEditSpecialization = (spec: Specialization) => {
    setNewSpecialization({
      nameAr: spec.nameAr,
      nameEn: spec.nameEn,
      icon: spec.icon,
      students: spec.students,
      description: spec.description || '',
      detailsLink: spec.detailsLink,
    });
    setEditingSpecializationId(spec.id);
    toast('جاهز للتعديل - عدّل ثم اضغط حفظ');
  };

  const handleCancelEditSpecialization = () => {
    setNewSpecialization({ nameAr: '', nameEn: '', icon: '', students: 0, description: '', detailsLink: '/departments' });
    setEditingSpecializationId(null);
    toast('تم إلغاء التعديل');
  };

  const handleMoveSpecialization = (id: string, direction: 'up' | 'down') => {
    const index = specializations.findIndex((s) => s.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === specializations.length - 1) return;

    const newSpecs = [...specializations];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSpecs[index], newSpecs[newIndex]] = [newSpecs[newIndex], newSpecs[index]];

    newSpecs.forEach((spec, i) => {
      spec.order = i + 1;
    });

    setSpecializations(newSpecs);
  };

  const handleToggleSpecializationVisibility = (id: string) => {
    setSpecializations(
      specializations.map((s) =>
        s.id === id ? { ...s, isVisible: !s.isVisible } : s
      )
    );
    toast.success('تم تحديث الظهور');
  };

  // Social Media Handlers
  const handleAddSocialMedia = () => {
    if (!newSocialMedia.name || !newSocialMedia.url) {
      toast.error('يرجى إدخال اسم المنصة والرابط');
      return;
    }

    if (editingSocialMediaId) {
      // Update existing
      setSocialMediaLinks(
        socialMediaLinks.map((s) =>
          s.id === editingSocialMediaId
            ? {
                ...s,
                name: newSocialMedia.name,
                icon: newSocialMedia.icon,
                url: newSocialMedia.url,
              }
            : s
        )
      );
      setEditingSocialMediaId(null);
      toast.success('تم تحديث الرابط');
    } else {
      // Add new
      const link: SocialMediaLink = {
        id: Date.now().toString(),
        name: newSocialMedia.name,
        icon: newSocialMedia.icon,
        url: newSocialMedia.url,
        order: socialMediaLinks.length + 1,
        isVisible: true,
      };
      setSocialMediaLinks([...socialMediaLinks, link]);
      toast.success('تمت إضافة الرابط');
    }

    setNewSocialMedia({ name: '', icon: 'Facebook', url: '' });
  };

  const handleDeleteSocialMedia = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرابط؟')) return;
    setSocialMediaLinks(socialMediaLinks.filter((s) => s.id !== id));
    if (editingSocialMediaId === id) {
      setEditingSocialMediaId(null);
      setNewSocialMedia({ name: '', icon: 'Facebook', url: '' });
    }
    toast.success('تم الحذف');
  };

  const handleEditSocialMedia = (link: SocialMediaLink) => {
    setNewSocialMedia({
      name: link.name,
      icon: link.icon,
      url: link.url,
    });
    setEditingSocialMediaId(link.id);
    toast('جاهز للتعديل - عدّل ثم اضغط حفظ');
  };

  const handleCancelEditSocialMedia = () => {
    setNewSocialMedia({ name: '', icon: 'Facebook', url: '' });
    setEditingSocialMediaId(null);
    toast('تم إلغاء التعديل');
  };

  const handleMoveSocialMedia = (id: string, direction: 'up' | 'down') => {
    const index = socialMediaLinks.findIndex((s) => s.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === socialMediaLinks.length - 1) return;

    const newLinks = [...socialMediaLinks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];

    newLinks.forEach((link, i) => {
      link.order = i + 1;
    });

    setSocialMediaLinks(newLinks);
  };

  const handleToggleSocialMediaVisibility = (id: string) => {
    setSocialMediaLinks(
      socialMediaLinks.map((s) =>
        s.id === id ? { ...s, isVisible: !s.isVisible } : s
      )
    );
    toast.success('تم تحديث الظهور');
  };

  // General News Handlers
  const handleAddGeneralNews = async () => {
    if (!newGeneralNews.title) {
      toast.error('يرجى إدخال عنوان الخبر');
      return;
    }

    const isUpdate = !!editingGeneralNewsId;
    const method = isUpdate ? 'PUT' : 'POST';
    const mainImage = newGeneralNews.media.find(m => m.type === 'image')?.url || null;
    const body = {
      ...(isUpdate ? { id: editingGeneralNewsId } : {}),
      title: newGeneralNews.title,
      content: newGeneralNews.description,
      image: mainImage,
      category: 'GENERAL_NEWS',
      published: true
    };

    try {
      const res = await fetch('/api/news', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (isUpdate) {
        setGeneralNews(
          generalNews.map((n) =>
            n.id === editingGeneralNewsId
              ? {
                  ...n,
                  title: newGeneralNews.title,
                  description: newGeneralNews.description,
                  media: newGeneralNews.media,
                  buttonText: newGeneralNews.buttonText,
                  buttonLink: newGeneralNews.buttonLink,
                }
              : n
          )
        );
        toast.success('تم تحديث الخبر');
      } else {
        const news: GeneralNews = {
          id: data.id,
          title: newGeneralNews.title,
          description: newGeneralNews.description,
          media: newGeneralNews.media,
          buttonText: newGeneralNews.buttonText,
          buttonLink: newGeneralNews.buttonLink,
          order: generalNews.length + 1,
        };
        setGeneralNews([news, ...generalNews]);
        toast.success('تمت إضافة الخبر');
      }
      setEditingGeneralNewsId(null);
      setNewGeneralNews({
        title: '',
        description: '',
        media: [],
        buttonText: '',
        buttonLink: '',
      });
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteGeneralNews = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    try {
      const res = await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setGeneralNews(generalNews.filter((n) => n.id !== id));
      if (editingGeneralNewsId === id) {
        setEditingGeneralNewsId(null);
        setNewGeneralNews({
          title: '',
          description: '',
          media: [],
          buttonText: '',
          buttonLink: '',
        });
      }
      toast.success('تم الحذف');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleEditGeneralNews = (news: GeneralNews) => {
    setNewGeneralNews({
      title: news.title,
      description: news.description,
      media: news.media,
      buttonText: news.buttonText,
      buttonLink: news.buttonLink,
    });
    setEditingGeneralNewsId(news.id);
    toast('جاهز للتعديل - عدّل ثم اضغط حفظ');
  };

  const handleCancelEditGeneralNews = () => {
    setNewGeneralNews({
      title: '',
      description: '',
      media: [],
      buttonText: '',
      buttonLink: '',
    });
    setEditingGeneralNewsId(null);
    toast('تم إلغاء التعديل');
  };

  const handleMoveGeneralNews = (id: string, direction: 'up' | 'down') => {
    const index = generalNews.findIndex((n) => n.id === id);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === generalNews.length - 1) return;

    const newsList = [...generalNews];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newsList[index], newsList[newIndex]] = [newsList[newIndex], newsList[index]];

    newsList.forEach((news, i) => {
      news.order = i + 1;
    });

    setGeneralNews(newsList);
  };

  const handleAddMedia = () => {
    if (!mediaUrl) {
      toast.error('يرجى إدخال رابط أو رفع ملف أولاً');
      return;
    }

    const media: GeneralNewsMedia = {
      id: Date.now().toString(),
      type: mediaType,
      url: mediaUrl,
      caption: mediaCaption || (mediaType === 'video' ? 'فيديو' : 'صورة'),
    };

    setNewGeneralNews({
      ...newGeneralNews,
      media: [...newGeneralNews.media, media],
    });

    // Reset fields
    setMediaUrl('');
    setMediaCaption('');
    toast.success(`تمت إضافة ${mediaType === 'video' ? 'الفيديو' : 'الصورة'} إلى Gallery`);
  };

  const handleDeleteMedia = (mediaId: string) => {
    setNewGeneralNews({
      ...newGeneralNews,
      media: newGeneralNews.media.filter((m) => m.id !== mediaId),
    });
    toast.success('تم حذف الوسائط');
  };

  const handleUploadMedia = async (file: File) => {
    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'فشل في رفع الملف');
      }

      const data = await response.json();
      setMediaUrl(data.url);
      setMediaType(data.type);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSaveAll = () => {
    // TODO: Save to API
    console.log('Saving:', { slides, stats, newsItems, instituteNews, specializations, socialMediaLinks, generalNews });
    toast.success('تم حفظ جميع التغييرات');
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة الصفحة الرئيسية</h1>
          <p className="text-muted-foreground">تحكم كامل في محتوى الصفحة الرئيسية (Slider, إحصائيات, أخبار, التخصصات)</p>
        </div>
        <Button onClick={handleSaveAll} size="lg">
          <Save className="ml-2 h-5 w-5" />
          حفظ جميع التغييرات
        </Button>
      </div>

      <Tabs defaultValue="slider" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="slider">
            <ImageIcon className="ml-2 h-4 w-4" />
            Hero Slider
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="ml-2 h-4 w-4" />
            الإحصائيات
          </TabsTrigger>
          <TabsTrigger value="news">
            <Megaphone className="ml-2 h-4 w-4" />
            شريط الأخبار
          </TabsTrigger>
          <TabsTrigger value="institute-news">
            <Megaphone className="ml-2 h-4 w-4" />
            أخبار عن المعهد
          </TabsTrigger>
          <TabsTrigger value="general-news">
            <Megaphone className="ml-2 h-4 w-4" />
            أخبار
          </TabsTrigger>
          <TabsTrigger value="specializations">
            <GraduationCap className="ml-2 h-4 w-4" />
            اختر تخصصك
          </TabsTrigger>
          <TabsTrigger value="social-media">
            <Facebook className="ml-2 h-4 w-4" />
            سوشيال ميديا
          </TabsTrigger>
        </TabsList>

        {/* Hero Slider */}
        <TabsContent value="slider" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة Hero Slider</CardTitle>
              <CardDescription>
                الشرائح المتحركة في أعلى الصفحة الرئيسية (الأبعاد الموصى بها: 1920x600 بكسل)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Slides */}
              <div className="space-y-4">
                <h3 className="font-semibold">الشرائح الحالية ({slides.length})</h3>
                {slides.map((slide, index) => (
                  <Card key={slide.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          <h4 className="font-semibold">{slide.title}</h4>
                        </div>
                        {slide.subtitle && (
                          <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                        )}
                        {slide.description && (
                          <p className="text-sm">{slide.description}</p>
                        )}
                        {slide.imageUrl && (
                          <div className="mt-2">
                            <div className="relative w-full max-w-md h-32 rounded-lg overflow-hidden border">
                              <img
                                src={slide.imageUrl}
                                alt={slide.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        {slide.buttonText && (
                          <div className="text-sm">
                            <span className="font-medium">زر:</span> {slide.buttonText} → {slide.buttonLink}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSlide(slide.id, 'up')}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSlide(slide.id, 'down')}
                          disabled={index === slides.length - 1}
                          title="تحريك لأسفل"
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewSlide({
                              title: slide.title,
                              subtitle: slide.subtitle,
                              description: slide.description,
                              buttonText: slide.buttonText,
                              buttonLink: slide.buttonLink,
                            });
                            setSliderImageUrl(slide.imageUrl || '');
                            setUploadedSliderImagePreview(slide.imageUrl || null);
                            setSlides(slides.filter(s => s.id !== slide.id));
                            toast('تم نقل الشريحة للتعديل - عدّل ثم احفظ');
                          }}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSlide(slide.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add New Slide */}
              <Card className="p-4 bg-muted/50">
                <h3 className="font-semibold mb-4">إضافة شريحة جديدة</h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>العنوان الرئيسي *</Label>
                      <Input
                        value={newSlide.title}
                        onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                        placeholder="مرحباً بكم..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>العنوان الفرعي</Label>
                      <Input
                        value={newSlide.subtitle}
                        onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                        placeholder="للدراسات النوعية"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={newSlide.description}
                      onChange={(e) => setNewSlide({ ...newSlide, description: e.target.value })}
                      placeholder="التعليم المتميز هو طريقنا للمستقبل"
                      rows={2}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نص الزر</Label>
                      <Input
                        value={newSlide.buttonText}
                        onChange={(e) => setNewSlide({ ...newSlide, buttonText: e.target.value })}
                        placeholder="التقديم الآن"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الزر</Label>
                      <Input
                        value={newSlide.buttonLink}
                        onChange={(e) => setNewSlide({ ...newSlide, buttonLink: e.target.value })}
                        placeholder="http://localhost:3001/apply أو https://example.com"
                        dir="ltr"
                      />
                      <p className="text-xs text-muted-foreground">
                        يمكن إضافة رابط داخلي (/apply) أو خارجي (https://example.com)
                      </p>
                    </div>
                  </div>
                  
                  {/* Hero Slider Image Upload */}
                  <div className="space-y-2">
                    <Label>صورة الخلفية</Label>
                    <div className="flex flex-col gap-3">
                      {/* Image Upload Button */}
                      <div className="flex items-center gap-2">
                        <Input
                          id="image-upload-hero-slider"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleSliderImageUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload-hero-slider')?.click()}
                          disabled={isUploadingSliderImage}
                        >
                          <Upload className="ml-2 h-4 w-4" />
                          {isUploadingSliderImage ? 'جاري الرفع...' : 'رفع صورة'}
                        </Button>
                        {sliderImageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveSliderImage}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      {(uploadedSliderImagePreview || sliderImageUrl) && (
                        <div className="relative w-full max-w-2xl h-48 rounded-lg overflow-hidden border">
                          <img
                            src={uploadedSliderImagePreview || sliderImageUrl}
                            alt="معاينة صورة الـ Slider"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        رفع صورة من جهازك (الأبعاد الموصى بها: 1920×600 بكسل، الحد الأقصى: 5MB)
                      </p>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddSlide}>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة الشريحة
                  </Button>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الإحصائيات</CardTitle>
              <CardDescription>
                الأرقام التي تظهر في قسم الإحصائيات أسفل Hero Slider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>عدد الطلاب</Label>
                  <Input
                    type="number"
                    value={stats.students}
                    onChange={(e) => setStats({ ...stats, students: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">سيظهر كـ: {stats.students}+ طالب وطالبة</p>
                </div>
                <div className="space-y-2">
                  <Label>عدد الأقسام الأكاديمية</Label>
                  <Input
                    type="number"
                    value={stats.departments}
                    onChange={(e) => setStats({ ...stats, departments: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">سيظهر كـ: {stats.departments} تخصص أكاديمي</p>
                </div>
                <div className="space-y-2">
                  <Label>عدد أعضاء هيئة التدريس</Label>
                  <Input
                    type="number"
                    value={stats.faculty}
                    onChange={(e) => setStats({ ...stats, faculty: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">سيظهر كـ: {stats.faculty}+ عضو هيئة تدريس</p>
                </div>
                <div className="space-y-2">
                  <Label>عدد الخريجين</Label>
                  <Input
                    type="number"
                    value={stats.graduates}
                    onChange={(e) => setStats({ ...stats, graduates: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">سيظهر كـ: {stats.graduates}+ خريج ناجح</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Institute News Carousel */}
        <TabsContent value="institute-news" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة أخبار عن المعهد</CardTitle>
              <CardDescription>
                منزلق أفقي يعرض أخبار ومعلومات عن المعهد أسفل Hero Slider مباشرة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Institute News */}
              <div className="space-y-4">
                <h3 className="font-semibold">الأخبار الحالية ({instituteNews.length})</h3>
                {instituteNews.map((news, index) => (
                  <Card
                    key={news.id}
                    className={`p-4 ${editingInstituteNewsId === news.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          {editingInstituteNewsId === news.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              قيد التعديل
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg">{news.title}</h4>
                        <p className="text-sm text-muted-foreground">{news.description}</p>
                        {news.points && news.points.length > 0 && (
                          <ul className="text-sm space-y-1">
                            {news.points.map((point, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                        {news.imageUrl && (
                          <div className="text-sm">
                            <span className="font-medium">الصورة:</span>{' '}
                            <a
                              href={news.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              عرض الصورة
                            </a>
                          </div>
                        )}
                        {news.buttonText && (
                          <div className="text-sm">
                            <span className="font-medium">زر:</span> {news.buttonText} → {news.buttonLink}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveInstituteNews(news.id, 'up')}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveInstituteNews(news.id, 'down')}
                          disabled={index === instituteNews.length - 1}
                          title="تحريك لأسفل"
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditInstituteNews(news)}
                          disabled={editingInstituteNewsId === news.id}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteInstituteNews(news.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add/Edit Institute News */}
              <Card className={`p-4 ${editingInstituteNewsId ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
                <h3 className="font-semibold mb-4">
                  {editingInstituteNewsId ? 'تعديل الخبر' : 'إضافة خبر جديد'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>العنوان الرئيسي *</Label>
                    <Input
                      value={newInstituteNews.title}
                      onChange={(e) =>
                        setNewInstituteNews({ ...newInstituteNews, title: e.target.value })
                      }
                      placeholder="معهد سيناء العالي للدراسات النوعية"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف *</Label>
                    <Textarea
                      value={newInstituteNews.description}
                      onChange={(e) =>
                        setNewInstituteNews({ ...newInstituteNews, description: e.target.value })
                      }
                      placeholder="مؤسسة تعليمية رائدة في مجال التعليم العالي..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>النقاط (Bullet Points)</Label>
                      <Button size="sm" variant="outline" onClick={handleAddPoint}>
                        <Plus className="ml-2 h-3 w-3" />
                        إضافة نقطة
                      </Button>
                    </div>
                    {newInstituteNews.points.map((point, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={point}
                          onChange={(e) => handleUpdatePoint(index, e.target.value)}
                          placeholder={`النقطة ${index + 1}`}
                        />
                        {newInstituteNews.points.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePoint(index)}
                            title="حذف النقطة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>الصورة</Label>
                    <div className="flex flex-col gap-3">
                      {/* Image Upload Button */}
                      <div className="flex items-center gap-2">
                        <Input
                          id="image-upload-institute-news"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload-institute-news')?.click()}
                          disabled={isUploadingImage}
                        >
                          <Upload className="ml-2 h-4 w-4" />
                          {isUploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                        </Button>
                        {newInstituteNews.imageUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveImage}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      {(uploadedImagePreview || newInstituteNews.imageUrl) && (
                        <div className="relative w-full max-w-xs h-48 rounded-lg overflow-hidden border">
                          <img
                            src={uploadedImagePreview || newInstituteNews.imageUrl}
                            alt="معاينة الصورة"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        رفع صورة من جهازك (الأبعاد الموصى بها: 600×400 بكسل، الحد الأقصى: 5MB)
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نص الزر</Label>
                      <Input
                        value={newInstituteNews.buttonText}
                        onChange={(e) =>
                          setNewInstituteNews({ ...newInstituteNews, buttonText: e.target.value })
                        }
                        placeholder="اقرأ المزيد"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الزر</Label>
                      <Input
                        value={newInstituteNews.buttonLink}
                        onChange={(e) =>
                          setNewInstituteNews({ ...newInstituteNews, buttonLink: e.target.value })
                        }
                        placeholder="/about"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddInstituteNews}>
                      {editingInstituteNewsId ? (
                        <>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة الخبر
                        </>
                      )}
                    </Button>
                    {editingInstituteNewsId && (
                      <Button variant="outline" onClick={handleCancelEditInstituteNews}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General News */}
        <TabsContent value="general-news" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الأخبار</CardTitle>
              <CardDescription>
                أخبار وفعاليات المعهد مع دعم الصور والفيديوهات (Gallery)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing News */}
              <div>
                <h3 className="font-semibold mb-4">
                  الأخبار الحالية ({generalNews.length})
                </h3>
                <div className="space-y-4">
                  {generalNews
                    .sort((a, b) => a.order - b.order)
                    .map((news, index) => (
                      <Card key={news.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">#{news.order}</Badge>
                              <h4 className="font-semibold">{news.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {news.description}
                            </p>
                            {news.media && news.media.length > 0 && (
                              <div className="flex gap-2 flex-wrap mb-2">
                                {news.media.map((m) => (
                                  <Badge key={m.id} variant="secondary">
                                    {m.type === 'video' ? '🎥' : '🖼️'} {m.caption || 'بدون عنوان'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {news.buttonText && (
                              <div className="text-xs text-muted-foreground">
                                زر: {news.buttonText} → {news.buttonLink}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveGeneralNews(news.id, 'up')}
                              disabled={index === 0}
                              title="تحريك لأعلى"
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveGeneralNews(news.id, 'down')}
                              disabled={index === generalNews.length - 1}
                              title="تحريك لأسفل"
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditGeneralNews(news)}
                              disabled={editingGeneralNewsId === news.id}
                              title="تعديل"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteGeneralNews(news.id)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>

              {/* Add/Edit News */}
              <Card className={`p-4 ${editingGeneralNewsId ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
                <h3 className="font-semibold mb-4">
                  {editingGeneralNewsId ? 'تعديل الخبر' : 'إضافة خبر جديد'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>العنوان *</Label>
                    <Input
                      value={newGeneralNews.title}
                      onChange={(e) =>
                        setNewGeneralNews({ ...newGeneralNews, title: e.target.value })
                      }
                      placeholder="مثال: فعاليات وأنشطة المعهد"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={newGeneralNews.description}
                      onChange={(e) =>
                        setNewGeneralNews({ ...newGeneralNews, description: e.target.value })
                      }
                      placeholder="وصف تفصيلي للخبر..."
                      rows={4}
                    />
                  </div>

                  {/* Media Gallery */}
                  <div className="space-y-2">
                    <Label>الصور والفيديوهات (Gallery)</Label>
                    <p className="text-xs text-muted-foreground">
                      يمكنك إضافة عدة صور وفيديوهات لكل خبر
                    </p>
                    
                    {/* Existing Media */}
                    {newGeneralNews.media.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            الوسائط المضافة ({newGeneralNews.media.length})
                          </p>
                          <Badge variant="outline">
                            {newGeneralNews.media.filter(m => m.type === 'image').length} صورة · {' '}
                            {newGeneralNews.media.filter(m => m.type === 'video').length} فيديو
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {newGeneralNews.media.map((media, idx) => (
                            <Card key={media.id} className="p-3 relative group hover:shadow-md transition-shadow">
                              <Badge 
                                variant={media.type === 'video' ? 'default' : 'secondary'}
                                className="absolute top-1 left-1 z-10 text-xs"
                              >
                                {media.type === 'video' ? '🎥' : '🖼️'} {idx + 1}
                              </Badge>
                              <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center overflow-hidden">
                                {media.type === 'video' ? (
                                  media.url.includes('youtube') || media.url.includes('vimeo') ? (
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                      <span className="text-3xl mb-2">🎥</span>
                                      <p className="text-xs text-muted-foreground">
                                        {media.url.includes('youtube') ? 'YouTube' : 'Vimeo'}
                                      </p>
                                    </div>
                                  ) : (
                                    <video src={media.url} className="w-full h-full object-cover rounded" controls />
                                  )
                                ) : media.url ? (
                                  <img 
                                    src={media.url} 
                                    alt={media.caption} 
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.src = '';
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-xs text-red-500">فشل تحميل الصورة</p></div>';
                                      }
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {media.caption || 'بدون عنوان'}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 truncate" dir="ltr">
                                {media.url}
                              </p>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                                onClick={() => handleDeleteMedia(media.id)}
                                title="حذف"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Media */}
                    <Card className="p-4 bg-muted/30">
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={mediaType === 'image' ? 'default' : 'outline'}
                            onClick={() => setMediaType('image')}
                          >
                            🖼️ صورة
                          </Button>
                          <Button
                            size="sm"
                            variant={mediaType === 'video' ? 'default' : 'outline'}
                            onClick={() => setMediaType('video')}
                          >
                            🎥 فيديو
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>رفع {mediaType === 'video' ? 'فيديو' : 'صورة'} من الجهاز</Label>
                          <div className="flex gap-2">
                            <Input
                              id="media-upload-general-news"
                              type="file"
                              accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadMedia(file);
                                }
                              }}
                              disabled={isUploadingMedia}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('media-upload-general-news')?.click()}
                              disabled={isUploadingMedia}
                              className="w-full"
                            >
                              {isUploadingMedia ? (
                                <>
                                  <Upload className="ml-2 h-4 w-4 animate-pulse" />
                                  جاري الرفع...
                                </>
                              ) : (
                                <>
                                  <Upload className="ml-2 h-4 w-4" />
                                  اختر ملف من جهازك
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {mediaType === 'video' 
                              ? 'أنواع مدعومة: MP4, WebM, OGG, MOV - حد أقصى: 50MB'
                              : 'أنواع مدعومة: JPG, PNG, WebP, GIF - حد أقصى: 5MB'
                            }
                          </p>
                        </div>

                        <div className="text-center text-muted-foreground text-sm">أو</div>

                        <div className="space-y-2">
                          <Label>رابط {mediaType === 'video' ? 'الفيديو' : 'الصورة'} (URL)</Label>
                          <Input
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            placeholder={
                              mediaType === 'video'
                                ? 'https://www.youtube.com/watch?v=...'
                                : 'https://example.com/image.jpg'
                            }
                            dir="ltr"
                          />
                          <p className="text-xs text-muted-foreground">
                            {mediaType === 'video'
                              ? 'يدعم YouTube، Vimeo، أو رابط فيديو مباشر'
                              : 'رابط الصورة'}
                          </p>
                          
                          {/* Preview */}
                          {mediaUrl && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">معاينة:</p>
                              <div className="border rounded-lg p-2 bg-muted/30">
                                {mediaType === 'image' ? (
                                  <img 
                                    src={mediaUrl} 
                                    alt="معاينة" 
                                    className="max-h-32 rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    سيتم عرض الفيديو بعد الإضافة
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>عنوان توضيحي (اختياري)</Label>
                          <Input
                            value={mediaCaption}
                            onChange={(e) => setMediaCaption(e.target.value)}
                            placeholder="وصف الصورة أو الفيديو"
                          />
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddMedia}
                          disabled={!mediaUrl}
                        >
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة إلى Gallery
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Button Settings */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نص الزر (اختياري)</Label>
                      <Input
                        value={newGeneralNews.buttonText}
                        onChange={(e) =>
                          setNewGeneralNews({ ...newGeneralNews, buttonText: e.target.value })
                        }
                        placeholder="اعرف المزيد"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط الزر</Label>
                      <Input
                        value={newGeneralNews.buttonLink}
                        onChange={(e) =>
                          setNewGeneralNews({ ...newGeneralNews, buttonLink: e.target.value })
                        }
                        placeholder="/activities"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddGeneralNews}>
                      {editingGeneralNewsId ? (
                        <>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة الخبر
                        </>
                      )}
                    </Button>
                    {editingGeneralNewsId && (
                      <Button variant="outline" onClick={handleCancelEditGeneralNews}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Specializations */}
        <TabsContent value="specializations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة قسم &quot;اختر تخصصك&quot;</CardTitle>
              <CardDescription>
                التخصصات الأكاديمية التي تظهر في الصفحة الرئيسية مع أعداد الطلاب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Specializations */}
              <div className="space-y-4">
                <h3 className="font-semibold">التخصصات الحالية ({specializations.length})</h3>
                {specializations.map((spec, index) => (
                  <Card
                    key={spec.id}
                    className={`p-4 ${editingSpecializationId === spec.id ? 'ring-2 ring-primary' : ''} ${
                      !spec.isVisible ? 'opacity-60 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          <span className="text-3xl">{spec.icon}</span>
                          <div>
                            <h4 className="font-semibold text-lg">{spec.nameAr}</h4>
                            <p className="text-sm text-muted-foreground">{spec.nameEn}</p>
                          </div>
                          {editingSpecializationId === spec.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              قيد التعديل
                            </span>
                          )}
                          {!spec.isVisible && (
                            <Badge variant="secondary" className="text-xs">
                              مخفي
                            </Badge>
                          )}
                        </div>
                        {spec.description && (
                          <p className="text-sm text-muted-foreground mr-12">{spec.description}</p>
                        )}
                        <div className="flex items-center gap-4 mr-12 text-sm">
                          <span className="font-medium">عدد الطلاب: {spec.students}</span>
                          <span className="text-muted-foreground">الرابط: {spec.detailsLink}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleSpecializationVisibility(spec.id)}
                          title={spec.isVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {spec.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSpecialization(spec.id, 'up')}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSpecialization(spec.id, 'down')}
                          disabled={index === specializations.length - 1}
                          title="تحريك لأسفل"
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSpecialization(spec)}
                          disabled={editingSpecializationId === spec.id}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSpecialization(spec.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add/Edit Specialization */}
              <Card className={`p-4 ${editingSpecializationId ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
                <h3 className="font-semibold mb-4">
                  {editingSpecializationId ? 'تعديل التخصص' : 'إضافة تخصص جديد'}
                </h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم التخصص (عربي) *</Label>
                      <Input
                        value={newSpecialization.nameAr}
                        onChange={(e) =>
                          setNewSpecialization({ ...newSpecialization, nameAr: e.target.value })
                        }
                        placeholder="إدارة ضيافة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم التخصص (إنجليزي) *</Label>
                      <Input
                        value={newSpecialization.nameEn}
                        onChange={(e) =>
                          setNewSpecialization({ ...newSpecialization, nameEn: e.target.value })
                        }
                        placeholder="Hospitality Management"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>الأيقونة / Emoji *</Label>
                      <Input
                        value={newSpecialization.icon}
                        onChange={(e) =>
                          setNewSpecialization({ ...newSpecialization, icon: e.target.value })
                        }
                        placeholder="🏨 أو رابط صورة"
                      />
                      <p className="text-xs text-muted-foreground">
                        يمكنك استخدام emoji مباشرة أو رابط لصورة
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>عدد الطلاب *</Label>
                      <Input
                        type="number"
                        value={newSpecialization.students}
                        onChange={(e) =>
                          setNewSpecialization({ ...newSpecialization, students: parseInt(e.target.value) || 0 })
                        }
                        placeholder="450"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رابط التفاصيل</Label>
                      <Input
                        value={newSpecialization.detailsLink}
                        onChange={(e) =>
                          setNewSpecialization({ ...newSpecialization, detailsLink: e.target.value })
                        }
                        placeholder="/departments"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف (اختياري)</Label>
                    <Textarea
                      value={newSpecialization.description}
                      onChange={(e) =>
                        setNewSpecialization({ ...newSpecialization, description: e.target.value })
                      }
                      placeholder="وصف مختصر عن التخصص..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSpecialization}>
                      {editingSpecializationId ? (
                        <>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة التخصص
                        </>
                      )}
                    </Button>
                    {editingSpecializationId && (
                      <Button variant="outline" onClick={handleCancelEditSpecialization}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* News Ticker */}
        <TabsContent value="news" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة شريط الأخبار</CardTitle>
              <CardDescription>
                الأخبار المتحركة التي تظهر في أعلى الموقع
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing News */}
              <div className="space-y-4">
                <h3 className="font-semibold">الأخبار الحالية ({newsItems.length})</h3>
                {newsItems.map((news, index) => (
                  <Card 
                    key={news.id} 
                    className={`p-4 ${editingNewsId === news.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          {editingNewsId === news.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              قيد التعديل
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{news.text}</p>
                        {news.link && (
                          <p className="text-xs text-muted-foreground">الرابط: {news.link}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditNews(news)}
                          disabled={editingNewsId === news.id}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteNews(news.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add/Edit News */}
              <Card className={`p-4 ${editingNewsId ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
                <h3 className="font-semibold mb-4">
                  {editingNewsId ? 'تعديل الخبر' : 'إضافة خبر جديد'}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>نص الخبر *</Label>
                    <Textarea
                      value={newNews.text}
                      onChange={(e) => setNewNews({ ...newNews, text: e.target.value })}
                      placeholder="بدء التسجيل للفصل الدراسي الجديد..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الرابط (اختياري)</Label>
                    <Input
                      value={newNews.link}
                      onChange={(e) => setNewNews({ ...newNews, link: e.target.value })}
                      placeholder="/admission"
                    />
                    <p className="text-xs text-muted-foreground">
                      الصفحة التي سينتقل إليها المستخدم عند الضغط على الخبر
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddNews}>
                      {editingNewsId ? (
                        <>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة الخبر
                        </>
                      )}
                    </Button>
                    {editingNewsId && (
                      <Button variant="outline" onClick={handleCancelEditNews}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social-media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إدارة سوشيال ميديا</CardTitle>
              <CardDescription>
                روابط منصات التواصل الاجتماعي التي تظهر في الـ Footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Social Media Links */}
              <div className="space-y-4">
                <h3 className="font-semibold">الروابط الحالية ({socialMediaLinks.length})</h3>
                {socialMediaLinks.map((link, index) => (
                  <Card
                    key={link.id}
                    className={`p-4 ${editingSocialMediaId === link.id ? 'ring-2 ring-primary' : ''} ${
                      !link.isVisible ? 'opacity-60 bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{link.icon === 'Facebook' ? '📘' : link.icon === 'Twitter' ? '🐦' : link.icon === 'Instagram' ? '📷' : link.icon === 'Linkedin' ? '💼' : link.icon === 'Youtube' ? '📹' : '🔗'}</span>
                            <div>
                              <h4 className="font-semibold">{link.name}</h4>
                              <p className="text-sm text-muted-foreground">{link.icon}</p>
                            </div>
                          </div>
                          {editingSocialMediaId === link.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              قيد التعديل
                            </span>
                          )}
                          {!link.isVisible && (
                            <Badge variant="secondary" className="text-xs">
                              مخفي
                            </Badge>
                          )}
                        </div>
                        <div className="mr-12 text-sm">
                          <span className="font-medium">الرابط:</span>{' '}
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleSocialMediaVisibility(link.id)}
                          title={link.isVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {link.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSocialMedia(link.id, 'up')}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveSocialMedia(link.id, 'down')}
                          disabled={index === socialMediaLinks.length - 1}
                          title="تحريك لأسفل"
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSocialMedia(link)}
                          disabled={editingSocialMediaId === link.id}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSocialMedia(link.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add/Edit Social Media */}
              <Card className={`p-4 ${editingSocialMediaId ? 'bg-primary/5 border-primary' : 'bg-muted/50'}`}>
                <h3 className="font-semibold mb-4">
                  {editingSocialMediaId ? 'تعديل الرابط' : 'إضافة رابط جديد'}
                </h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المنصة *</Label>
                      <Input
                        value={newSocialMedia.name}
                        onChange={(e) =>
                          setNewSocialMedia({ ...newSocialMedia, name: e.target.value })
                        }
                        placeholder="Facebook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع الأيقونة *</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={newSocialMedia.icon}
                        onChange={(e) =>
                          setNewSocialMedia({ ...newSocialMedia, icon: e.target.value })
                        }
                      >
                        <option value="Facebook">Facebook 📘</option>
                        <option value="Twitter">Twitter 🐦</option>
                        <option value="Instagram">Instagram 📷</option>
                        <option value="Linkedin">LinkedIn 💼</option>
                        <option value="Youtube">YouTube 📹</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>رابط المنصة *</Label>
                    <Input
                      value={newSocialMedia.url}
                      onChange={(e) =>
                        setNewSocialMedia({ ...newSocialMedia, url: e.target.value })
                      }
                      placeholder="https://www.facebook.com/sinaiinistitute"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      يجب أن يبدأ الرابط بـ https://
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSocialMedia}>
                      {editingSocialMediaId ? (
                        <>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ التعديلات
                        </>
                      ) : (
                        <>
                          <Plus className="ml-2 h-4 w-4" />
                          إضافة الرابط
                        </>
                      )}
                    </Button>
                    {editingSocialMediaId && (
                      <Button variant="outline" onClick={handleCancelEditSocialMedia}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
