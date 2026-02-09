'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { FontFamily } from '@tiptap/extension-font-family';
import { Typography } from '@tiptap/extension-typography';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import { Gapcursor } from '@tiptap/extension-gapcursor';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Minus,
  Table as TableIcon,
  Undo2,
  Redo2,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  RemoveFormatting,
  Palette,
  Type,
  PaintBucket,
  Sparkles,
  Box,
  Columns,
  Smile,
  Settings,
  ChevronDown,
  // Elementor Widgets Icons
  Video,
  TrendingUp,
  Star,
  Activity,
  AlertCircle,
  MessageSquare,
  MapPin,
  Share2,
  Package,
  ChevronRight,
  Play,
  BarChart3,
  Award,
  Clock,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function RichTextEditorAdvanced({ content, onChange }: RichTextEditorProps) {
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffff00');
  const [fontSize, setFontSize] = useState('16');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [letterSpacing, setLetterSpacing] = useState('0');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Subscript,
      Superscript,
      Typography,
      Dropcursor,
      Gapcursor,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer hover:text-blue-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 bg-blue-100 font-bold text-right',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 text-right',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] max-h-[700px] overflow-y-auto p-8 bg-white',
        dir: 'rtl',
        style: 'text-align: right;',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('أدخل الرابط:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('أدخل رابط الصورة:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const applyTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const applyHighlight = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
  };

  const applyFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };

  const applyFontFamily = (family: string) => {
    editor.chain().focus().setFontFamily(family).run();
  };

  const applyLineHeight = (height: string) => {
    editor.chain().focus().setMark('textStyle', { lineHeight: height }).run();
  };

  const applyLetterSpacing = (spacing: string) => {
    editor.chain().focus().setMark('textStyle', { letterSpacing: `${spacing}px` }).run();
  };

  const insertDivider = () => {
    editor.chain().focus().setHorizontalRule().run();
  };

  const insertButton = () => {
    const text = window.prompt('نص الزر:', 'انقر هنا');
    const url = window.prompt('رابط الزر:', 'https://');
    if (text && url) {
      const buttonHtml = `<a href="${url}" class="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors" style="text-decoration: none;">${text}</a>`;
      editor.chain().focus().insertContent(buttonHtml).run();
    }
  };

  const insertSpacer = () => {
    const height = window.prompt('ارتفاع المسافة (بالبكسل):', '50');
    if (height) {
      const spacerHtml = `<div style="height: ${height}px;"></div>`;
      editor.chain().focus().insertContent(spacerHtml).run();
    }
  };

  const insertColumns = () => {
    const columnsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0;">
        <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
          <p>عمود 1 - اكتب هنا</p>
        </div>
        <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
          <p>عمود 2 - اكتب هنا</p>
        </div>
      </div>
    `;
    editor.chain().focus().insertContent(columnsHtml).run();
  };

  // ========= Elementor Widgets Functions =========

  const insertVideo = () => {
    const url = window.prompt('أدخل رابط الفيديو (YouTube أو Vimeo):', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (url) {
      let embedUrl = url;
      
      // Convert YouTube URL to embed format
      if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      } else if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }

      const videoHtml = `
        <div class="elementor-video-widget">
          <iframe 
            src="${embedUrl}" 
            allowfullscreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
        </div>
      `;
      editor.chain().focus().insertContent(videoHtml).run();
    }
  };

  const insertCounter = () => {
    const number = window.prompt('الرقم:', '1000');
    const title = window.prompt('العنوان:', 'طلاب متفوقون');
    const prefix = window.prompt('بادئة (اختياري - مثل: +, -, $):', '+');
    const suffix = window.prompt('لاحقة (اختياري - مثل: %, سنة):', '');
    if (number && title) {
      const counterHtml = `
        <div class="elementor-counter-widget">
          <div>
            ${prefix || ''}${number}${suffix || ''}
          </div>
          <div>
            ${title}
          </div>
        </div>
      `;
      editor.chain().focus().insertContent(counterHtml).run();
    }
  };

  const insertStarRating = () => {
    const rating = window.prompt('التقييم (من 1 إلى 5):', '5');
    const ratingNum = Math.min(5, Math.max(1, parseInt(rating || '5')));
    const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
    
    const ratingHtml = `
      <div class="elementor-star-rating" style="display: inline-block; font-size: 2rem; color: #FFC107; margin: 1rem 0;">
        ${stars}
      </div>
    `;
    editor.chain().focus().insertContent(ratingHtml).run();
  };

  const insertProgressBar = () => {
    const title = window.prompt('العنوان:', 'التقدم');
    const percentage = window.prompt('النسبة المئوية (0-100):', '75');
    const percent = Math.min(100, Math.max(0, parseInt(percentage || '75')));
    
    const progressHtml = `
      <div class="elementor-progress-bar">
        <div>
          <span>${title}</span>
          <span>${percent}%</span>
        </div>
        <div>
          <div style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
    editor.chain().focus().insertContent(progressHtml).run();
  };

  const insertAlert = () => {
    const message = window.prompt('رسالة التنبيه:', 'هذا إشعار مهم!');
    const types = ['معلومات', 'نجاح', 'تحذير', 'خطأ'];
    const typeIndex = parseInt(window.prompt('نوع التنبيه:\n0 = معلومات (أزرق)\n1 = نجاح (أخضر)\n2 = تحذير (أصفر)\n3 = خطأ (أحمر)', '0') || '0');
    
    const colors = [
      { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
      { bg: '#F0FDF4', border: '#10B981', text: '#065F46' },
      { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
      { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' }
    ];
    
    const color = colors[Math.min(3, Math.max(0, typeIndex))];
    
    const alertHtml = `
      <div class="elementor-alert-widget" style="padding: 1rem 1.5rem; background: ${color.bg}; border-right: 4px solid ${color.border}; color: ${color.text}; border-radius: 8px; margin: 1rem 0; font-weight: 500;">
        ${message}
      </div>
    `;
    editor.chain().focus().insertContent(alertHtml).run();
  };

  const insertTestimonial = () => {
    const quote = window.prompt('نص الشهادة:', 'خدمة ممتازة وتجربة رائعة! أنصح بها بشدة.');
    const name = window.prompt('اسم الشخص:', 'أحمد محمد');
    const title = window.prompt('المسمى الوظيفي:', 'مدير تنفيذي - شركة النجاح');
    
    if (quote && name && title) {
      const testimonialHtml = `
        <div class="elementor-testimonial-widget">
          <div>"</div>
          <p>${quote}</p>
          <div>
            <div>${name}</div>
            <div>${title}</div>
          </div>
        </div>
      `;
      editor.chain().focus().insertContent(testimonialHtml).run();
    }
  };

  const insertGoogleMap = () => {
    const location = window.prompt('الموقع أو الإحداثيات:', 'القاهرة، مصر');
    if (location) {
      const encodedLocation = encodeURIComponent(location);
      
      const mapHtml = `
        <div class="elementor-google-map">
          <iframe 
            src="https://maps.google.com/maps?q=${encodedLocation}&t=&z=13&ie=UTF8&iwloc=&output=embed" 
            allowfullscreen 
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      `;
      editor.chain().focus().insertContent(mapHtml).run();
    }
  };

  const insertSocialIcons = () => {
    const facebook = window.prompt('رابط Facebook (اختياري):', 'https://facebook.com/yourpage');
    const twitter = window.prompt('رابط Twitter/X (اختياري):', 'https://twitter.com/yourpage');
    const instagram = window.prompt('رابط Instagram (اختياري):', 'https://instagram.com/yourpage');
    const linkedin = window.prompt('رابط LinkedIn (اختياري):', 'https://linkedin.com/in/yourpage');
    
    const socialHtml = `
      <div class="elementor-social-icons">
        ${facebook ? `<a href="${facebook}" target="_blank" style="background: #1877F2;">f</a>` : ''}
        ${twitter ? `<a href="${twitter}" target="_blank" style="background: #1DA1F2;">𝕏</a>` : ''}
        ${instagram ? `<a href="${instagram}" target="_blank" style="background: linear-gradient(45deg, #F58529, #DD2A7B, #8134AF);">IG</a>` : ''}
        ${linkedin ? `<a href="${linkedin}" target="_blank" style="background: #0A66C2;">in</a>` : ''}
      </div>
    `;
    editor.chain().focus().insertContent(socialHtml).run();
  };

  const insertIconBox = () => {
    const title = window.prompt('العنوان:', 'خدمة مميزة');
    const description = window.prompt('الوصف:', 'نقدم أفضل الخدمات لعملائنا بجودة عالية واحترافية تامة');
    const icon = window.prompt('رمز الأيقونة (emoji أو رمز):', '⭐');
    
    if (title && description && icon) {
      const iconBoxHtml = `
        <div class="elementor-icon-box">
          <div>${icon}</div>
          <h3>${title}</h3>
          <p>${description}</p>
        </div>
      `;
      editor.chain().focus().insertContent(iconBoxHtml).run();
    }
  };

  const insertAccordion = () => {
    const title1 = window.prompt('عنوان القسم الأول:', 'ما هي ساعات العمل؟');
    const content1 = window.prompt('محتوى القسم الأول:', 'نحن نعمل من الأحد إلى الخميس من الساعة 9 صباحاً حتى 5 مساءً.');
    const title2 = window.prompt('عنوان القسم الثاني:', 'كيف يمكنني التواصل معكم؟');
    const content2 = window.prompt('محتوى القسم الثاني:', 'يمكنك التواصل معنا عبر البريد الإلكتروني أو الهاتف أو زيارتنا في المقر.');
    const title3 = window.prompt('عنوان القسم الثالث (اختياري):', 'ما هي شروط التسجيل؟');
    const content3 = title3 ? window.prompt('محتوى القسم الثالث:', 'يجب تقديم المستندات المطلوبة ودفع الرسوم.') : '';
    
    if (title1 && content1 && title2 && content2) {
      const accordionHtml = `
        <div class="elementor-accordion">
          <details>
            <summary>${title1}</summary>
            <div>${content1}</div>
          </details>
          <details>
            <summary>${title2}</summary>
            <div>${content2}</div>
          </details>
          ${title3 && content3 ? `
          <details>
            <summary>${title3}</summary>
            <div>${content3}</div>
          </details>
          ` : ''}
        </div>
      `;
      editor.chain().focus().insertContent(accordionHtml).run();
    }
  };

  // مجموعة من الألوان الجاهزة
  const colors = [
    { name: 'أسود', value: '#000000' },
    { name: 'أزرق', value: '#0B69D4' },
    { name: 'ذهبي', value: '#FFC700' },
    { name: 'أحمر', value: '#EF4444' },
    { name: 'أخضر', value: '#10B981' },
    { name: 'برتقالي', value: '#F59E0B' },
    { name: 'بنفسجي', value: '#8B5CF6' },
    { name: 'رمادي', value: '#6B7280' },
    { name: 'أبيض', value: '#FFFFFF' },
    { name: 'وردي', value: '#EC4899' },
  ];

  const highlightColors = [
    { name: 'أصفر', value: '#FFFF00' },
    { name: 'أخضر', value: '#BBF7D0' },
    { name: 'أزرق', value: '#DBEAFE' },
    { name: 'وردي', value: '#FBCFE8' },
    { name: 'برتقالي', value: '#FED7AA' },
    { name: 'بنفسجي', value: '#E9D5FF' },
  ];

  const fonts = [
    { label: 'Tajawal (افتراضي)', value: 'Tajawal' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Calibri', value: 'Calibri' },
    { label: 'Tahoma', value: 'Tahoma' },
  ];

  return (
    <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Toolbar */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 p-4 border-b-2 border-blue-700">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Typography Controls - Elementor Style */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-md"
              >
                <Type className="h-4 w-4 mr-1" />
                خيارات الخط
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="start">
              <Tabs defaultValue="font" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="font">الخط</TabsTrigger>
                  <TabsTrigger value="spacing">المسافات</TabsTrigger>
                  <TabsTrigger value="effects">تأثيرات</TabsTrigger>
                </TabsList>

                <TabsContent value="font" className="space-y-4 mt-4">
                  {/* Font Family */}
                  <div>
                    <Label className="text-sm font-bold mb-2 block">نوع الخط</Label>
                    <Select onValueChange={applyFontFamily}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <Label className="text-sm font-bold mb-2 block">
                      حجم الخط: {fontSize}px
                    </Label>
                    <Slider
                      value={[parseInt(fontSize)]}
                      onValueChange={(value) => {
                        setFontSize(value[0].toString());
                        applyFontSize(value[0].toString());
                      }}
                      min={8}
                      max={72}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>8px</span>
                      <span>72px</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="spacing" className="space-y-4 mt-4">
                  {/* Line Height */}
                  <div>
                    <Label className="text-sm font-bold mb-2 block">
                      ارتفاع السطر: {lineHeight}
                    </Label>
                    <Slider
                      value={[parseFloat(lineHeight)]}
                      onValueChange={(value) => {
                        setLineHeight(value[0].toFixed(1));
                        applyLineHeight(value[0].toFixed(1));
                      }}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <Label className="text-sm font-bold mb-2 block">
                      المسافة بين الحروف: {letterSpacing}px
                    </Label>
                    <Slider
                      value={[parseFloat(letterSpacing)]}
                      onValueChange={(value) => {
                        setLetterSpacing(value[0].toString());
                        applyLetterSpacing(value[0].toString());
                      }}
                      min={-5}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="effects" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().setMark('textStyle', { textTransform: 'uppercase' }).run()}
                    >
                      ABC
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().setMark('textStyle', { textTransform: 'lowercase' }).run()}
                    >
                      abc
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().setMark('textStyle', { textTransform: 'capitalize' }).run()}
                    >
                      Abc
                    </Button>
                  </div>

                  <div>
                    <Label className="text-sm font-bold mb-2 block">ظل النص</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => editor.chain().focus().setMark('textStyle', { textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }).run()}
                    >
                      إضافة ظل
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* Headings */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-md">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="عنوان 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="عنوان 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="عنوان 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Text Formatting */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-md">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="عريض"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="مائل"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('underline') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="تحته خط"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('strike') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="يتوسطه خط"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </div>

          {/* Colors */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="bg-white text-gray-700 hover:bg-gray-100 shadow-md"
                title="الألوان"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">لون النص</TabsTrigger>
                  <TabsTrigger value="bg">لون الخلفية</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-3 mt-3">
                  <div className="grid grid-cols-5 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform shadow-md"
                        style={{ backgroundColor: color.value }}
                        onClick={() => applyTextColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center pt-2">
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        applyTextColor(e.target.value);
                      }}
                      className="w-20 h-12"
                    />
                    <span className="text-sm text-gray-600">لون مخصص</span>
                  </div>
                </TabsContent>

                <TabsContent value="bg" className="space-y-3 mt-3">
                  <div className="grid grid-cols-6 gap-2">
                    {highlightColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform shadow-md"
                        style={{ backgroundColor: color.value }}
                        onClick={() => applyHighlight(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center pt-2">
                    <Input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        applyHighlight(e.target.value);
                      }}
                      className="w-20 h-12"
                    />
                    <span className="text-sm text-gray-600">لون مخصص</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                    className="w-full"
                  >
                    إزالة التظليل
                  </Button>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* Alignment */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-md">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              title="يمين"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              title="وسط"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              title="يسار"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              title="ضبط"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-md">
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="قائمة نقطية"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="قائمة مرقمة"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Insert Elements - Elementor Widgets */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 font-bold shadow-md"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Widgets
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="start">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">أساسي</TabsTrigger>
                  <TabsTrigger value="content">محتوى</TabsTrigger>
                  <TabsTrigger value="social">تفاعلي</TabsTrigger>
                </TabsList>

                {/* Basic Widgets */}
                <TabsContent value="basic" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={setLink}
                      className="flex items-center justify-start gap-2"
                    >
                      <Link2 className="h-4 w-4" />
                      رابط
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addImage}
                      className="flex items-center justify-start gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      صورة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertVideo}
                      className="flex items-center justify-start gap-2 bg-red-50"
                    >
                      <Video className="h-4 w-4" />
                      فيديو
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertButton}
                      className="flex items-center justify-start gap-2 bg-blue-50"
                    >
                      <Box className="h-4 w-4" />
                      زر
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertDivider}
                      className="flex items-center justify-start gap-2"
                    >
                      <Minus className="h-4 w-4" />
                      فاصل
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertSpacer}
                      className="flex items-center justify-start gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      مسافة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertColumns}
                      className="flex items-center justify-start gap-2 bg-green-50"
                    >
                      <Columns className="h-4 w-4" />
                      أعمدة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      className="flex items-center justify-start gap-2"
                    >
                      <Quote className="h-4 w-4" />
                      اقتباس
                    </Button>
                  </div>
                </TabsContent>

                {/* Content Widgets */}
                <TabsContent value="content" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertCounter}
                      className="flex items-center justify-start gap-2 bg-purple-50"
                    >
                      <TrendingUp className="h-4 w-4" />
                      عداد
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertProgressBar}
                      className="flex items-center justify-start gap-2 bg-blue-50"
                    >
                      <Activity className="h-4 w-4" />
                      شريط تقدم
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertStarRating}
                      className="flex items-center justify-start gap-2 bg-yellow-50"
                    >
                      <Star className="h-4 w-4" />
                      تقييم نجوم
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertAlert}
                      className="flex items-center justify-start gap-2 bg-orange-50"
                    >
                      <AlertCircle className="h-4 w-4" />
                      تنبيه
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertTable}
                      className="flex items-center justify-start gap-2"
                    >
                      <TableIcon className="h-4 w-4" />
                      جدول
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertAccordion}
                      className="flex items-center justify-start gap-2 bg-indigo-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                      أكورديون
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertTestimonial}
                      className="flex items-center justify-start gap-2 bg-teal-50"
                    >
                      <MessageSquare className="h-4 w-4" />
                      شهادة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertIconBox}
                      className="flex items-center justify-start gap-2 bg-cyan-50"
                    >
                      <Package className="h-4 w-4" />
                      صندوق أيقونة
                    </Button>
                  </div>
                </TabsContent>

                {/* Social & Interactive Widgets */}
                <TabsContent value="social" className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertSocialIcons}
                      className="flex items-center justify-start gap-2 bg-blue-50"
                    >
                      <Share2 className="h-4 w-4" />
                      أيقونات اجتماعية
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={insertGoogleMap}
                      className="flex items-center justify-start gap-2 bg-green-50"
                    >
                      <MapPin className="h-4 w-4" />
                      خريطة
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* Undo/Redo */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-md">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="تراجع"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="إعادة"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear Formatting */}
          <Button
            type="button"
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600 shadow-md"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="مسح التنسيق"
          >
            <RemoveFormatting className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} className="prose-rtl" />
      </div>

      {/* Footer Stats - Elementor Style */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-3 border-t-2 border-gray-300">
        <div className="flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <span className="text-gray-700">
              <strong>الكلمات:</strong>{' '}
              <span className="text-blue-600 font-bold">
                {editor.state.doc.textContent.split(' ').filter((w) => w).length}
              </span>
            </span>
            <span className="text-gray-700">
              <strong>الأحرف:</strong>{' '}
              <span className="text-blue-600 font-bold">
                {editor.state.doc.textContent.length}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Smile className="h-4 w-4" />
            <span className="text-xs">
              💡 نصيحة: استخدم Ctrl+Z للتراجع | Ctrl+Y للإعادة
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
