// ====== Page Builder Types ======

export type WidgetType =
  // Basic Widgets
  | 'heading'
  | 'text'
  | 'image'
  | 'video'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'icon'
  // Layout Widgets
  | 'container'
  | 'columns'
  | 'section'
  // Advanced Widgets
  | 'accordion'
  | 'tabs'
  | 'carousel'
  | 'iconBox'
  | 'counter'
  | 'testimonial'
  | 'callToAction'
  | 'contactForm'
  | 'socialIcons'
  | 'googleMap'
  | 'progressBar'
  | 'imageGallery'
  | 'videoPopup'
  | 'pricingTable'
  | 'teamMember';

export interface BlockContent {
  // Heading
  headingText?: string;
  headingTag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
  // Text
  text?: string;
  
  // Image
  imageUrl?: string;
  imageAlt?: string;
  
  // Video
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'file';
  
  // Button
  buttonText?: string;
  buttonLink?: string;
  buttonTarget?: '_self' | '_blank';
  
  // Icon
  iconName?: string;
  iconSize?: number;
  
  // Columns
  columnCount?: number;
  columnGap?: number;
  
  // Custom content for complex widgets
  [key: string]: any;
}

export interface BlockSettings {
  // Spacing
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  
  // Colors
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  
  // Typography
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontFamily?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  
  // Border
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  
  // Dimensions
  width?: string;
  height?: string;
  maxWidth?: string;
  minHeight?: string;
  
  // Display
  display?: 'block' | 'inline' | 'inline-block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  
  // Effects
  boxShadow?: string;
  opacity?: number;
  transform?: string;
  transition?: string;
  
  // Animation
  animation?: string;
  animationDuration?: number;
  animationDelay?: number;
  
  // Custom CSS
  customCSS?: string;
  customClass?: string;
}

export interface ResponsiveSettings {
  desktop?: Partial<BlockSettings>;
  tablet?: Partial<BlockSettings>;
  mobile?: Partial<BlockSettings>;
}

export interface PageBlock {
  id: string;
  type: WidgetType;
  content: BlockContent;
  settings: BlockSettings;
  responsive?: ResponsiveSettings;
  order: number;
  parentBlockId?: string | null;
  isVisible: boolean;
  children?: PageBlock[];
}

export interface Page {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  blocks: PageBlock[];
  parentId?: string | null;
  level: number;
  showInHeader: boolean;
  showInFooter: boolean;
  isPublished: boolean;
  order: number;
  metaTitle?: string;
  metaDesc?: string;
  metaKeywords?: string;
  ogImage?: string;
  template: 'blank' | 'full-width' | 'with-sidebar';
  customCSS?: string;
  customJS?: string;
  currentVersion: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  blocksData: string; // JSON
  comment?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface WidgetConfig {
  type: WidgetType;
  name: string;
  icon: string;
  category: 'basic' | 'layout' | 'advanced';
  defaultContent: BlockContent;
  defaultSettings: BlockSettings;
  settingsSchema: {
    content: Record<string, any>;
    style: Record<string, any>;
    advanced: Record<string, any>;
  };
}

// ====== Page Builder State ======

export interface PageBuilderState {
  page: Page | null;
  blocks: PageBlock[];
  selectedBlockId: string | null;
  isDragging: boolean;
  history: PageBlock[][];
  historyIndex: number;
  isSaving: boolean;
  isDirty: boolean;
}

export interface PageBuilderActions {
  setPage: (page: Page) => void;
  addBlock: (block: PageBlock, parentId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<PageBlock>) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, newIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
}

// ====== Widget Library ======

export const WIDGET_CATEGORIES = {
  basic: 'أساسي',
  layout: 'تخطيط',
  advanced: 'متقدم',
} as const;

export const WIDGETS_CONFIG: Record<WidgetType, WidgetConfig> = {
  heading: {
    type: 'heading',
    name: 'عنوان',
    icon: 'Type',
    category: 'basic',
    defaultContent: {
      headingText: 'عنوان جديد',
      headingTag: 'h2',
    },
    defaultSettings: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'right',
      marginBottom: 20,
    },
    settingsSchema: {
      content: {
        headingText: { type: 'text', label: 'النص' },
        headingTag: { type: 'select', label: 'مستوى العنوان', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
      },
      style: {
        fontSize: { type: 'slider', label: 'حجم الخط', min: 12, max: 72, unit: 'px' },
        fontWeight: { type: 'select', label: 'سمك الخط', options: ['normal', 'bold', '400', '600', '700'] },
        textColor: { type: 'color', label: 'لون النص' },
        textAlign: { type: 'radio', label: 'المحاذاة', options: ['left', 'center', 'right'] },
      },
      advanced: {
        customClass: { type: 'text', label: 'CSS Class' },
      },
    },
  },
  text: {
    type: 'text',
    name: 'نص',
    icon: 'AlignLeft',
    category: 'basic',
    defaultContent: {
      text: '<p>اكتب نصك هنا...</p>',
    },
    defaultSettings: {
      fontSize: 16,
      lineHeight: 1.6,
      textAlign: 'right',
    },
    settingsSchema: {
      content: {
        text: { type: 'richtext', label: 'المحتوى' },
      },
      style: {
        fontSize: { type: 'slider', label: 'حجم الخط', min: 12, max: 32, unit: 'px' },
        lineHeight: { type: 'slider', label: 'ارتفاع السطر', min: 1, max: 3, step: 0.1 },
        textColor: { type: 'color', label: 'لون النص' },
      },
      advanced: {},
    },
  },
  image: {
    type: 'image',
    name: 'صورة',
    icon: 'Image',
    category: 'basic',
    defaultContent: {
      imageUrl: '/placeholder.jpg',
      imageAlt: 'صورة',
    },
    defaultSettings: {
      width: '100%',
      borderRadius: 0,
    },
    settingsSchema: {
      content: {
        imageUrl: { type: 'image', label: 'الصورة' },
        imageAlt: { type: 'text', label: 'النص البديل' },
      },
      style: {
        width: { type: 'text', label: 'العرض' },
        height: { type: 'text', label: 'الارتفاع' },
        borderRadius: { type: 'slider', label: 'حدة الزوايا', min: 0, max: 50, unit: 'px' },
      },
      advanced: {},
    },
  },
  // سأضيف باقي الـ widgets لاحقاً...
} as any;
