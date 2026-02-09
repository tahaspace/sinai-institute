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

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffff00');

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
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 bg-gray-100 font-bold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] max-h-[600px] overflow-y-auto p-6 bg-white',
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
  ];

  const highlightColors = [
    { name: 'أصفر', value: '#FFFF00' },
    { name: 'أخضر', value: '#BBF7D0' },
    { name: 'أزرق', value: '#DBEAFE' },
    { name: 'وردي', value: '#FBCFE8' },
    { name: 'برتقالي', value: '#FED7AA' },
  ];

  const fontSizes = [
    { label: 'صغير جداً', value: '12px' },
    { label: 'صغير', value: '14px' },
    { label: 'عادي', value: '16px' },
    { label: 'متوسط', value: '18px' },
    { label: 'كبير', value: '24px' },
    { label: 'كبير جداً', value: '32px' },
    { label: 'ضخم', value: '48px' },
  ];

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg bg-gray-50">
      {/* Toolbar - Enhanced */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 border-b-2 border-gray-300">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Row 1: Headings & Formatting */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">عناوين:</span>
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

          <div className="w-px h-8 bg-gray-400" />

          {/* Text Formatting */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">تنسيق:</span>
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
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('subscript') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              title="منخفض"
            >
              <SubscriptIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('superscript') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              title="مرتفع"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-8 bg-gray-400" />

          {/* Colors */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">ألوان:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" size="sm" variant="ghost" title="لون النص">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-bold mb-2 block">لون النص</Label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className="w-10 h-10 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color.value }}
                          onClick={() => applyTextColor(color.value)}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          applyTextColor(e.target.value);
                        }}
                        className="w-20 h-10"
                      />
                      <span className="text-xs text-gray-600">لون مخصص</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={editor.isActive('highlight') ? 'default' : 'ghost'}
                  title="لون الخلفية"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                  <Label className="text-sm font-bold">لون الخلفية (تظليل)</Label>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {highlightColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className="w-10 h-10 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color.value }}
                        onClick={() => applyHighlight(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        applyHighlight(e.target.value);
                      }}
                      className="w-20 h-10"
                    />
                    <span className="text-xs text-gray-600">لون مخصص</span>
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
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-px h-8 bg-gray-400" />

          {/* Lists */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">قوائم:</span>
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

          <div className="w-px h-8 bg-gray-400" />

          {/* Alignment */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">محاذاة:</span>
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

          <div className="w-px h-8 bg-gray-400" />

          {/* Insert Elements */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
            <span className="text-xs font-semibold text-gray-600 px-2">إدراج:</span>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('link') ? 'default' : 'ghost'}
              onClick={setLink}
              title="رابط"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={addImage}
              title="صورة"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('table') ? 'default' : 'ghost'}
              onClick={insertTable}
              title="جدول"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="اقتباس"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editor.isActive('code') ? 'default' : 'ghost'}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="كود"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="خط أفقي"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-8 bg-gray-400" />

          {/* Undo/Redo */}
          <div className="flex gap-1 items-center bg-white rounded-md p-1 shadow-sm">
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

          <div className="w-px h-8 bg-gray-400" />

          {/* Clear Formatting */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="مسح التنسيق"
            className="bg-white shadow-sm"
          >
            <RemoveFormatting className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} className="prose-rtl" />
      </div>

      {/* Footer Info */}
      <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-t flex justify-between items-center">
        <span>💡 نصيحة: استخدم Ctrl+Z للتراجع و Ctrl+Y للإعادة</span>
        <span className="text-blue-600 font-semibold">
          عدد الكلمات: {editor.state.doc.textContent.split(' ').filter(w => w).length}
        </span>
      </div>
    </div>
  );
}
