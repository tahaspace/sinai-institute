'use client';

import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsTabs from 'grapesjs-tabs';
import grapesjsCustomCode from 'grapesjs-custom-code';
import grapesjsTouch from 'grapesjs-touch';
import grapesjsTooltip from 'grapesjs-tooltip';
import { Button } from '@/components/ui/button';
import { Save, Eye, Monitor, Tablet, Smartphone, Code } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GrapesBuilderProps {
  pageId: string;
  initialHtml?: string;
  initialCss?: string;
  onSave: (html: string, css: string) => Promise<void>;
}

export default function GrapesBuilder({ pageId, initialHtml = '', initialCss = '', onSave }: GrapesBuilderProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    if (!editorRef.current || editor) return;

    const grapesEditor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: 'auto',
      fromElement: false,
      
      // RTL Configuration
      i18n: {
        locale: 'ar',
        detectLocale: false,
        messages: {
          ar: {
            styleManager: {
              sectors: {
                general: 'عام',
                layout: 'تخطيط',
                typography: 'خطوط',
                decorations: 'زخرفة',
                extra: 'إضافي'
              },
              properties: {
                width: 'العرض',
                height: 'الارتفاع',
                'max-width': 'أقصى عرض',
                'min-height': 'أدنى ارتفاع',
                margin: 'الهامش الخارجي',
                padding: 'الهامش الداخلي',
                'font-family': 'نوع الخط',
                'font-size': 'حجم الخط',
                'font-weight': 'وزن الخط',
                'letter-spacing': 'تباعد الأحرف',
                color: 'اللون',
                'line-height': 'ارتفاع السطر',
                'text-align': 'محاذاة النص',
                'text-decoration': 'زخرفة النص',
                'text-shadow': 'ظل النص',
                'background-color': 'لون الخلفية',
                'border-radius': 'حدة الزوايا',
                border: 'الحد',
                'box-shadow': 'ظل الصندوق',
                background: 'الخلفية',
                transition: 'التحول',
                perspective: 'المنظور',
                transform: 'التحويل'
              }
            },
            traitManager: {
              empty: 'حدد عنصراً لتعديل خصائصه',
              label: 'إعدادات المكون',
              traits: {
                labels: {
                  id: 'المعرف',
                  title: 'العنوان',
                  alt: 'نص بديل',
                  href: 'الرابط',
                  target: 'الهدف',
                  type: 'النوع',
                  name: 'الاسم',
                  placeholder: 'نص توضيحي',
                  value: 'القيمة',
                  required: 'مطلوب',
                  checked: 'محدد'
                }
              }
            },
            blockManager: {
              labels: {
                'block-id': 'معرف الكتلة',
                category: 'الفئة'
              },
              categories: {
                'أساسي': 'أساسي',
                'تخطيط': 'تخطيط',
                'مكونات': 'مكونات'
              }
            },
            deviceManager: {
              device: 'الجهاز',
              devices: {
                desktop: 'سطح المكتب',
                tablet: 'تابلت',
                mobileLandscape: 'موبايل أفقي',
                mobilePortrait: 'موبايل عمودي'
              }
            },
            panels: {
              buttons: {
                titles: {
                  preview: 'معاينة',
                  fullscreen: 'ملء الشاشة',
                  'sw-visibility': 'عرض الحدود',
                  'export-template': 'عرض الكود',
                  'open-sm': 'فتح مدير الأنماط',
                  'open-tm': 'الإعدادات',
                  'open-layers': 'فتح مدير الطبقات',
                  'open-blocks': 'فتح الكتل'
                }
              }
            },
            selectorManager: {
              label: 'الفئات',
              selected: 'محدد',
              emptyState: '- الحالة -',
              states: {
                hover: 'تمرير',
                active: 'نشط',
                'nth-of-type(2n)': 'زوجي/فردي'
              }
            },
            layerManager: {
              category: 'الفئة',
              label: 'الطبقات',
              root: 'الجذر'
            },
            domComponents: {
              names: {
                '': 'صندوق',
                wrapper: 'الجسم',
                text: 'نص',
                comment: 'تعليق',
                image: 'صورة',
                video: 'فيديو',
                label: 'تسمية',
                link: 'رابط',
                map: 'خريطة',
                tfoot: 'ذيل الجدول',
                tbody: 'جسم الجدول',
                thead: 'رأس الجدول',
                table: 'جدول',
                row: 'صف الجدول',
                cell: 'خلية الجدول'
              }
            }
          }
        }
      },
      
      // Storage Configuration
      storageManager: false, // نستخدم API بدلاً من localStorage
      
      // Panels Configuration
      panels: {
        defaults: [
          {
            id: 'devices-c',
            buttons: [
              {
                id: 'set-device-desktop',
                command: 'set-device-desktop',
                className: 'fa fa-desktop',
                active: true,
              },
              {
                id: 'set-device-tablet',
                command: 'set-device-tablet',
                className: 'fa fa-tablet',
              },
              {
                id: 'set-device-mobile',
                command: 'set-device-mobile',
                className: 'fa fa-mobile',
              },
            ],
          },
          {
            id: 'options',
            buttons: [
              {
                id: 'sw-visibility',
                command: 'sw-visibility',
                className: 'fa fa-square-o',
                active: true,
              },
              {
                id: 'preview',
                command: 'preview',
                className: 'fa fa-eye',
              },
              {
                id: 'fullscreen',
                command: 'fullscreen',
                className: 'fa fa-arrows-alt',
              },
              {
                id: 'export-template',
                command: 'export-template',
                className: 'fa fa-code',
              },
              {
                id: 'undo',
                command: 'undo',
                className: 'fa fa-undo',
              },
              {
                id: 'redo',
                command: 'redo',
                className: 'fa fa-repeat',
              },
            ],
          },
        ],
      },

      // Device Manager
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
          },
          {
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px',
          },
          {
            name: 'Mobile',
            width: '375px',
            widthMedia: '768px',
          },
        ],
      },

      // Plugins
      plugins: [
        grapesjsPluginForms,
        grapesjsTabs,
        grapesjsCustomCode,
        grapesjsTouch,
        grapesjsTooltip,
      ],

      // Plugin Options
      pluginsOpts: {
        'grapesjs-preset-webpage': {
          modalImportTitle: 'استيراد',
          modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">الصق HTML/CSS الخاص بك</div>',
          modalImportContent: (editor: any) => editor.getHtml() + '<style>' + editor.getCss() + '</style>',
          importPlaceholder: '',
          cellStyle: {
            'min-height': '75px',
          },
          blocksBasicOpts: {
            flexGrid: true,
          },
          blocks: [], // عطّل الـ blocks الافتراضية
          customStyleManager: [
            {
              name: 'الأبعاد',
              buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
              properties: [
                {
                  type: 'integer',
                  name: 'العرض',
                  property: 'width',
                  units: ['px', '%'],
                  defaults: 'auto',
                  min: 0,
                },
              ],
            },
            {
              name: 'الخطوط',
              buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration', 'text-shadow'],
              properties: [
                {
                  name: 'نوع الخط',
                  property: 'font-family',
                },
                {
                  name: 'حجم الخط',
                  property: 'font-size',
                  units: ['px', 'em', 'rem'],
                  defaults: '16px',
                },
                {
                  name: 'وزن الخط',
                  property: 'font-weight',
                },
                {
                  name: 'المحاذاة',
                  property: 'text-align',
                  list: [
                    { value: 'left', name: 'يسار' },
                    { value: 'center', name: 'وسط' },
                    { value: 'right', name: 'يمين' },
                    { value: 'justify', name: 'ضبط' },
                  ],
                },
              ],
            },
            {
              name: 'الزخرفة',
              buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
              properties: [
                {
                  name: 'لون الخلفية',
                  property: 'background-color',
                },
                {
                  name: 'حدة الزوايا',
                  property: 'border-radius',
                  units: ['px', '%'],
                  defaults: '0',
                },
              ],
            },
          ],
        },
        'grapesjs-blocks-basic': {
          flexGrid: true,
          blocks: [], // عطّل جميع العناصر الافتراضية
        },
        'grapesjs-plugin-forms': {
          blocks: [], // عطّل عناصر النماذج الافتراضية - سنضيف عناصر عربية
        },
        'grapesjs-tabs': {},
        'grapesjs-custom-code': {},
        'grapesjs-tooltip': {},
      },

      // Canvas Configuration
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
        ],
        scripts: [],
      },

      // Style Manager
      styleManager: {
        sectors: [
          {
            name: 'الأبعاد',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'الخطوط',
            open: false,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'],
          },
          {
            name: 'الزخرفة',
            open: false,
            buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
          },
          {
            name: 'إضافي',
            open: false,
            buildProps: ['transition', 'perspective', 'transform'],
          },
        ],
      },

      // Block Manager
      blockManager: {
        appendTo: '#blocks',
        blocks: [
          {
            id: 'section',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-square-o" style="font-size: 42px; color: #0B69D4; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">قسم</div></div>',
            category: 'تخطيط',
            content: `
              <section style="padding: 50px 0; background-color: #f5f5f5;">
                <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                  <h2 style="text-align: center; margin-bottom: 20px;">عنوان القسم</h2>
                  <p style="text-align: center;">محتوى القسم هنا...</p>
                </div>
              </section>
            `,
          },
          {
            id: 'heading',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-header" style="font-size: 42px; color: #0B69D4; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">عنوان</div></div>',
            category: 'أساسي',
            content: '<h2 style="text-align: right; direction: rtl;">عنوان جديد</h2>',
          },
          {
            id: 'text',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-paragraph" style="font-size: 42px; color: #0B69D4; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">نص</div></div>',
            category: 'أساسي',
            content: '<p style="text-align: right; direction: rtl;">اكتب نصك هنا...</p>',
          },
          {
            id: 'image',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-image" style="font-size: 42px; color: #10b981; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">صورة</div></div>',
            category: 'أساسي',
            content: {
              type: 'image',
              style: { width: '100%' },
              activeOnRender: 1,
            },
          },
          {
            id: 'video',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-video-camera" style="font-size: 42px; color: #ef4444; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">فيديو</div></div>',
            category: 'أساسي',
            content: {
              type: 'video',
              src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              style: { height: '350px', width: '100%' },
            },
          },
          {
            id: 'button',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-hand-pointer-o" style="font-size: 42px; color: #f59e0b; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">زر</div></div>',
            category: 'أساسي',
            content: '<a href="#" style="display: inline-block; padding: 12px 24px; background-color: #0B69D4; color: white; text-decoration: none; border-radius: 4px; text-align: center;">انقر هنا</a>',
          },
          {
            id: 'divider',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-minus" style="font-size: 42px; color: #6366f1; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">فاصل</div></div>',
            category: 'أساسي',
            content: '<hr style="border: 1px solid #ddd; margin: 20px 0;">',
          },
          {
            id: 'link',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-link" style="font-size: 42px; color: #3b82f6; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">رابط</div></div>',
            category: 'أساسي',
            content: '<a href="#" style="color: #0B69D4; text-decoration: underline;">رابط جديد</a>',
          },
          {
            id: 'list',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-list" style="font-size: 42px; color: #8b5cf6; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">قائمة</div></div>',
            category: 'أساسي',
            content: `
              <ul style="direction: rtl; text-align: right; padding-right: 20px;">
                <li style="margin-bottom: 8px;">العنصر الأول</li>
                <li style="margin-bottom: 8px;">العنصر الثاني</li>
                <li style="margin-bottom: 8px;">العنصر الثالث</li>
              </ul>
            `,
          },
          {
            id: '2-columns',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-columns" style="font-size: 42px; color: #f59e0b; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">عمودين</div></div>',
            category: 'تخطيط',
            content: `
              <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px; padding: 20px; background-color: #f9f9f9;">
                  <h3>عمود 1</h3>
                  <p>محتوى العمود الأول...</p>
                </div>
                <div style="flex: 1; min-width: 300px; padding: 20px; background-color: #f9f9f9;">
                  <h3>عمود 2</h3>
                  <p>محتوى العمود الثاني...</p>
                </div>
              </div>
            `,
          },
          {
            id: '3-columns',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-th" style="font-size: 42px; color: #f59e0b; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">3 أعمدة</div></div>',
            category: 'تخطيط',
            content: `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div style="padding: 20px; background-color: #f9f9f9;">
                  <h4>عمود 1</h4>
                  <p>محتوى...</p>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                  <h4>عمود 2</h4>
                  <p>محتوى...</p>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9;">
                  <h4>عمود 3</h4>
                  <p>محتوى...</p>
                </div>
              </div>
            `,
          },
          {
            id: 'card',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-id-card" style="font-size: 42px; color: #10b981; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">بطاقة</div></div>',
            category: 'مكونات',
            content: `
              <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <img src="https://via.placeholder.com/400x200" style="width: 100%; border-radius: 8px; margin-bottom: 15px;" alt="Card image">
                <h3 style="margin-bottom: 10px; direction: rtl; text-align: right;">عنوان البطاقة</h3>
                <p style="color: #666; margin-bottom: 15px; direction: rtl; text-align: right;">وصف البطاقة هنا...</p>
                <a href="#" style="display: inline-block; padding: 8px 16px; background-color: #0B69D4; color: white; text-decoration: none; border-radius: 4px;">اقرأ المزيد</a>
              </div>
            `,
          },
          {
            id: 'container',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-square-o" style="font-size: 42px; color: #64748b; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">حاوية</div></div>',
            category: 'تخطيط',
            content: `
              <div style="padding: 20px; border: 2px dashed #ddd; min-height: 100px;">
                <p style="text-align: center; color: #999;">اسحب العناصر هنا</p>
              </div>
            `,
          },
          {
            id: 'hero',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-star" style="font-size: 42px; color: #facc15; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">Hero</div></div>',
            category: 'مكونات',
            content: `
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 80px 20px; text-align: center; color: white; border-radius: 12px;">
                <h1 style="font-size: 48px; margin-bottom: 20px; direction: rtl;">عنوان رئيسي مميز</h1>
                <p style="font-size: 20px; margin-bottom: 30px; direction: rtl;">وصف قصير وجذاب هنا</p>
                <a href="#" style="display: inline-block; padding: 15px 40px; background-color: white; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: bold;">ابدأ الآن</a>
              </div>
            `,
          },
          {
            id: 'testimonial',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-quote-right" style="font-size: 42px; color: #ec4899; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">شهادة</div></div>',
            category: 'مكونات',
            content: `
              <div style="background-color: #f9fafb; padding: 30px; border-radius: 12px; border-left: 4px solid #0B69D4;">
                <p style="font-size: 18px; font-style: italic; margin-bottom: 20px; direction: rtl; text-align: right;">"هذه شهادة رائعة من أحد العملاء السعداء بالخدمة المقدمة"</p>
                <div style="display: flex; align-items: center; gap: 15px;">
                  <img src="https://via.placeholder.com/60" style="width: 60px; height: 60px; border-radius: 50%;" alt="Avatar">
                  <div style="direction: rtl; text-align: right;">
                    <div style="font-weight: bold;">اسم العميل</div>
                    <div style="color: #666; font-size: 14px;">الوظيفة</div>
                  </div>
                </div>
              </div>
            `,
          },
          {
            id: 'cta-box',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-bullhorn" style="font-size: 42px; color: #f97316; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">دعوة للعمل</div></div>',
            category: 'مكونات',
            content: `
              <div style="background-color: #0B69D4; color: white; padding: 40px; text-align: center; border-radius: 12px;">
                <h2 style="font-size: 32px; margin-bottom: 15px; direction: rtl;">جاهز للبدء؟</h2>
                <p style="font-size: 18px; margin-bottom: 25px; direction: rtl;">انضم إلينا اليوم واحصل على أفضل الخدمات</p>
                <a href="#" style="display: inline-block; padding: 12px 30px; background-color: white; color: #0B69D4; text-decoration: none; border-radius: 6px; font-weight: bold;">اشترك الآن</a>
              </div>
            `,
          },
          {
            id: 'feature-box',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-check-circle" style="font-size: 42px; color: #22c55e; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">ميزة</div></div>',
            category: 'مكونات',
            content: `
              <div style="text-align: center; padding: 25px;">
                <div style="width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                  <i class="fa fa-check" style="font-size: 40px; color: #22c55e;"></i>
                </div>
                <h3 style="margin-bottom: 10px; direction: rtl;">عنوان الميزة</h3>
                <p style="color: #666; direction: rtl; text-align: center;">وصف مختصر عن الميزة وفوائدها للمستخدم</p>
              </div>
            `,
          },
          // Form Elements - عناصر النماذج
          {
            id: 'form',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-wpforms" style="font-size: 42px; color: #0ea5e9; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">نموذج</div></div>',
            category: 'نماذج',
            content: `
              <form style="padding: 20px; background-color: #f9fafb; border-radius: 8px; direction: rtl;">
                <h3 style="margin-bottom: 20px; text-align: right;">نموذج جديد</h3>
                <div style="margin-bottom: 15px;">
                  <label style="display: block; margin-bottom: 5px; font-weight: 600;">الاسم:</label>
                  <input type="text" placeholder="أدخل اسمك" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <button type="submit" style="padding: 10px 20px; background-color: #0B69D4; color: white; border: none; border-radius: 4px; cursor: pointer;">إرسال</button>
              </form>
            `,
          },
          {
            id: 'input',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-i-cursor" style="font-size: 42px; color: #06b6d4; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">حقل إدخال</div></div>',
            category: 'نماذج',
            content: `
              <div style="margin-bottom: 15px; direction: rtl;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600; text-align: right;">تسمية الحقل:</label>
                <input type="text" placeholder="أدخل النص هنا" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
            `,
          },
          {
            id: 'textarea',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-align-left" style="font-size: 42px; color: #14b8a6; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">منطقة نص</div></div>',
            category: 'نماذج',
            content: `
              <div style="margin-bottom: 15px; direction: rtl;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600; text-align: right;">الرسالة:</label>
                <textarea placeholder="اكتب رسالتك هنا..." rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
              </div>
            `,
          },
          {
            id: 'select',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-caret-square-o-down" style="font-size: 42px; color: #8b5cf6; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">قائمة منسدلة</div></div>',
            category: 'نماذج',
            content: `
              <div style="margin-bottom: 15px; direction: rtl;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600; text-align: right;">اختر خياراً:</label>
                <select style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="">-- اختر --</option>
                  <option value="1">الخيار 1</option>
                  <option value="2">الخيار 2</option>
                  <option value="3">الخيار 3</option>
                </select>
              </div>
            `,
          },
          {
            id: 'checkbox',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-check-square" style="font-size: 42px; color: #22c55e; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">مربع اختيار</div></div>',
            category: 'نماذج',
            content: `
              <div style="margin-bottom: 15px; direction: rtl;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" style="width: 18px; height: 18px;">
                  <span>أوافق على الشروط والأحكام</span>
                </label>
              </div>
            `,
          },
          {
            id: 'radio',
            label: '<div style="display: flex; flex-direction: column; align-items: center; padding: 10px;"><i class="fa fa-dot-circle-o" style="font-size: 42px; color: #f59e0b; margin-bottom: 12px; display: block;"></i><div style="font-weight: 700; font-size: 14px; color: #1e3a8a; font-family: Tajawal, sans-serif;">زر راديو</div></div>',
            category: 'نماذج',
            content: `
              <div style="margin-bottom: 15px; direction: rtl;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; text-align: right;">اختر واحداً:</label>
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; cursor: pointer;">
                  <input type="radio" name="choice" value="1" style="width: 18px; height: 18px;">
                  <span>الخيار الأول</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="radio" name="choice" value="2" style="width: 18px; height: 18px;">
                  <span>الخيار الثاني</span>
                </label>
              </div>
            `,
          },
        ],
      },

      // Layer Manager
      layerManager: {
        appendTo: '#layers',
      },

      // Traits Manager
      traitManager: {
        appendTo: '#traits',
      },

      // Selector Manager
      selectorManager: {
        appendTo: '#styles',
      },
    });

    // Set initial content after editor is ready
    grapesEditor.on('load', () => {
      try {
        if (initialHtml) {
          grapesEditor.setComponents(initialHtml);
        } else {
          // Set default empty section if no content
          grapesEditor.setComponents(`
            <section style="padding: 50px 0;">
              <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                <h2 style="text-align: center; margin-bottom: 20px;">ابدأ بإضافة محتوى هنا</h2>
                <p style="text-align: center;">اسحب العناصر من القائمة اليمنى لبناء صفحتك</p>
              </div>
            </section>
          `);
        }
        
        if (initialCss) {
          grapesEditor.setStyle(initialCss);
        }
        
        // Force open all block categories and translate any remaining English text
        setTimeout(() => {
          const categories = document.querySelectorAll('.gjs-block-category');
          categories.forEach((category) => {
            const title = category.querySelector('.gjs-title');
            const blocksContainer = category.querySelector('.gjs-blocks-c');
            
            // Translate category titles
            if (title) {
              const titleText = title.textContent?.trim();
              const translations: Record<string, string> = {
                'Basic': 'أساسي',
                'Layout': 'تخطيط',
                'Components': 'مكونات',
                'Forms': 'نماذج',
                'Extra': 'إضافي'
              };
              if (titleText && translations[titleText]) {
                title.textContent = translations[titleText];
              }
            }
            
            if (title && blocksContainer) {
              category.classList.add('gjs-open');
              blocksContainer.style.display = 'flex';
              blocksContainer.style.flexWrap = 'wrap';
              blocksContainer.style.maxHeight = 'none';
              blocksContainer.style.overflow = 'visible';
              blocksContainer.style.opacity = '1';
            }
          });
          
          // Translate any remaining English block labels
          const blocks = document.querySelectorAll('.gjs-block');
          blocks.forEach((block) => {
            const label = block.querySelector('.gjs-block-label');
            if (label) {
              const labelText = label.textContent?.trim();
              const blockTranslations: Record<string, string> = {
                'Text': 'نص',
                'Image': 'صورة',
                'Video': 'فيديو',
                'Link': 'رابط',
                'Map': 'خريطة',
                'Text Section': 'قسم نصي',
                'Quote': 'اقتباس',
                'Link Block': 'كتلة رابط',
                'Grid Items': 'عناصر الشبكة',
                'List Items': 'عناصر القائمة'
              };
              if (labelText && blockTranslations[labelText]) {
                label.textContent = blockTranslations[labelText];
              }
            }
          });
          
          console.log('✅ All block categories opened and translated');
        }, 800);
        
        // Mark as loaded
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading content:', error);
        setIsLoading(false);
      }
    });

    // Add custom commands
    grapesEditor.Commands.add('set-device-desktop', {
      run: (editor: any) => editor.setDevice('Desktop'),
    });
    grapesEditor.Commands.add('set-device-tablet', {
      run: (editor: any) => editor.setDevice('Tablet'),
    });
    grapesEditor.Commands.add('set-device-mobile', {
      run: (editor: any) => editor.setDevice('Mobile'),
    });

    // Add RTL support
    grapesEditor.on('component:add', (component: any) => {
      if (component.get('type') === 'text' || component.get('type') === 'heading') {
        component.addStyle({ 'text-align': 'right', 'direction': 'rtl' });
      }
    });

    setEditor(grapesEditor);

    return () => {
      if (grapesEditor) {
        try {
          grapesEditor.destroy();
        } catch (error) {
          console.error('Error destroying GrapesJS:', error);
        }
      }
    };
  }, [initialHtml, initialCss]);

  const handleSave = async () => {
    if (!editor) {
      toast.error('المحرر غير جاهز بعد');
      return;
    }

    try {
      setIsSaving(true);
      const html = editor.getHtml();
      const css = editor.getCss();
      
      if (!html || html.trim() === '') {
        toast.error('لا يوجد محتوى لحفظه');
        return;
      }
      
      await onSave(html, css);
      toast.success('تم حفظ الصفحة بنجاح!');
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('فشل في حفظ الصفحة');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!editor) {
      toast.error('المحرر غير جاهز بعد');
      return;
    }
    try {
      editor.runCommand('preview');
    } catch (error) {
      console.error('Error running preview:', error);
      toast.error('فشل في عرض المعاينة');
    }
  };

  const handleDeviceChange = (newDevice: 'desktop' | 'tablet' | 'mobile') => {
    if (!editor) {
      toast.error('المحرر غير جاهز بعد');
      return;
    }
    
    try {
      setDevice(newDevice);
      
      const deviceMap = {
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobile',
      };
      
      editor.setDevice(deviceMap[newDevice]);
    } catch (error) {
      console.error('Error changing device:', error);
      toast.error('فشل في تغيير العرض');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Custom Styles for GrapesJS */}
      <style jsx global>{`
        /* تحسين مظهر العناصر في القائمة */
        .gjs-block {
          min-height: 100px !important;
          margin: 8px 4px !important;
          border-radius: 8px !important;
          border: 2px solid #e5e7eb !important;
          background: white !important;
          transition: all 0.2s ease !important;
          cursor: grab !important;
        }
        
        .gjs-block:hover {
          border-color: #0B69D4 !important;
          box-shadow: 0 4px 12px rgba(11, 105, 212, 0.15) !important;
          transform: translateY(-2px) !important;
        }
        
        .gjs-block:active {
          cursor: grabbing !important;
        }
        
        /* تحسين عناوين الفئات */
        .gjs-block-category .gjs-title {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          padding: 12px 15px !important;
          font-weight: 700 !important;
          font-size: 15px !important;
          border-radius: 6px !important;
          margin-bottom: 10px !important;
          font-family: 'Tajawal', sans-serif !important;
          cursor: pointer !important;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2) !important;
        }
        
        .gjs-block-category .gjs-title:hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
        }
        
        /* حاوية العناصر */
        .gjs-blocks-c {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
          padding: 8px !important;
        }
        
        /* تحسين Panel Buttons */
        .gjs-pn-btn {
          border-radius: 6px !important;
          margin: 0 4px !important;
          transition: all 0.2s ease !important;
        }
        
        .gjs-pn-btn:hover {
          background-color: #0B69D4 !important;
          color: white !important;
        }
        
        .gjs-pn-active {
          background-color: #0B69D4 !important;
          color: white !important;
        }
        
        /* تحسين Canvas */
        .gjs-cv-canvas {
          background-color: #f3f4f6 !important;
        }
        
        /* تحسين Layers */
        .gjs-layer {
          border-radius: 4px !important;
          margin: 4px 0 !important;
          padding: 8px !important;
        }
        
        .gjs-layer:hover {
          background-color: #f3f4f6 !important;
        }
        
        .gjs-layer.gjs-selected {
          background-color: #dbeafe !important;
          border-left: 3px solid #0B69D4 !important;
        }
        
        /* تحسين Style Manager */
        .gjs-sm-sector {
          border-radius: 6px !important;
          margin-bottom: 10px !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .gjs-sm-sector .gjs-sm-title {
          background-color: #f9fafb !important;
          padding: 10px 12px !important;
          font-weight: 600 !important;
          border-radius: 6px 6px 0 0 !important;
        }
        
        /* RTL Support */
        .gjs-blocks-c,
        .gjs-sm-properties,
        .gjs-layers,
        .gjs-traits-c {
          direction: rtl !important;
          text-align: right !important;
        }
        
        /* تحسين Typography */
        .gjs-block-category,
        .gjs-sm-sector,
        .gjs-layer,
        .gjs-trait {
          font-family: 'Tajawal', 'Cairo', sans-serif !important;
        }
      `}</style>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل المحرر...</p>
          </div>
        </div>
      )}
      
      {/* Custom Toolbar */}
      <div className="bg-background border-b p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={device === 'desktop' ? 'default' : 'outline'}
            onClick={() => handleDeviceChange('desktop')}
            disabled={isLoading}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={device === 'tablet' ? 'default' : 'outline'}
            onClick={() => handleDeviceChange('tablet')}
            disabled={isLoading}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={device === 'mobile' ? 'default' : 'outline'}
            onClick={() => handleDeviceChange('mobile')}
            disabled={isLoading}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading}
          >
            <Eye className="ml-2 h-4 w-4" />
            معاينة
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            <Save className="ml-2 h-4 w-4" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>

      {/* GrapesJS Editor */}
      <div className="flex-1 flex overflow-hidden" style={{ direction: 'ltr' }}>
        {/* Left Sidebar - Layers & Traits */}
        <div className="w-64 bg-gray-50 border-r overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="border-b bg-gray-100 p-2 font-bold text-sm">
              📋 الطبقات
            </div>
            <div id="layers" className="p-2"></div>
          </div>
          <div className="flex-1 overflow-y-auto border-t">
            <div className="border-b bg-gray-100 p-2 font-bold text-sm">
              ⚙️ الخصائص
            </div>
            <div id="traits" className="p-2"></div>
          </div>
        </div>
        
        {/* Main Canvas */}
        <div ref={editorRef} className="flex-1 bg-white"></div>
        
        {/* Right Sidebar - Blocks & Styles */}
        <div className="w-80 bg-gray-50 border-l overflow-hidden flex flex-col">
          <div className="h-1/2 overflow-y-auto border-b">
            <div className="border-b bg-gray-100 p-2 font-bold text-sm sticky top-0 z-10">
              🧩 العناصر
            </div>
            <div id="blocks" className="p-3"></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="border-b bg-gray-100 p-2 font-bold text-sm sticky top-0 z-10">
              🎨 الأنماط
            </div>
            <div id="styles" className="p-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
