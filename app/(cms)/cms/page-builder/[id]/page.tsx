'use client';

import { use, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Save, Eye, Undo, Redo, Settings, ArrowLeft, Plus } from 'lucide-react';
import type { Page, PageBlock } from '@/types/page-builder';

export default function PageBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showWidgetPanel, setShowWidgetPanel] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Load page data
  useEffect(() => {
    loadPage();
  }, [pageId]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pages/${pageId}`);
      if (!response.ok) throw new Error('Failed to load page');
      
      const data = await response.json();
      setPage(data.page);
      
      // Parse blocks
      const parsedBlocks = data.page.blocks.map((block: any) => ({
        ...block,
        content: typeof block.content === 'string' ? JSON.parse(block.content) : block.content,
        settings: typeof block.settings === 'string' ? JSON.parse(block.settings) : block.settings,
      }));
      
      setBlocks(parsedBlocks);
    } catch (error) {
      console.error('Error loading page:', error);
      toast.error('فشل في تحميل الصفحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/pages/${pageId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: blocks.map(block => ({
            ...block,
            content: block.content,
            settings: block.settings,
          })),
          createVersion: true,
          versionComment: 'تحديث من Page Builder',
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      toast.success('تم حفظ الصفحة بنجاح!');
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('فشل في حفظ الصفحة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);

    // Update order
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index,
    }));

    setBlocks(updatedBlocks);
  };

  const addBlock = (type: string) => {
    const newBlock: PageBlock = {
      id: `temp-${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      settings: getDefaultSettings(type),
      order: blocks.length,
      isVisible: true,
    };

    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    toast.success(`تم إضافة ${getWidgetName(type)}`);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    toast.success('تم حذف البلوك');
  };

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const newBlock: PageBlock = {
      ...block,
      id: `temp-${Date.now()}`,
      order: blocks.length,
    };

    setBlocks([...blocks, newBlock]);
    toast.success('تم نسخ البلوك');
  };

  const updateBlock = (blockId: string, updates: Partial<PageBlock>) => {
    setBlocks(blocks.map((block) =>
      block.id === blockId ? { ...block, ...updates } : block
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">الصفحة غير موجودة</p>
          <Button onClick={() => router.push('/cms/pages')}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للصفحات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cms/pages')}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
          <div>
            <h1 className="text-lg font-bold">{page.titleAr}</h1>
            <p className="text-sm text-muted-foreground">Page Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* TODO: Undo */}}
            disabled
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* TODO: Redo */}}
            disabled
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/${page.slug}`, '_blank')}
          >
            <Eye className="ml-2 h-4 w-4" />
            معاينة
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="ml-2 h-4 w-4" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Widgets Panel */}
        {showWidgetPanel && (
          <div className="w-64 bg-muted/20 border-l p-4 overflow-y-auto">
            <h3 className="font-bold mb-4">الودجتس</h3>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock('heading')}
              >
                <Plus className="ml-2 h-4 w-4" />
                عنوان
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock('text')}
              >
                <Plus className="ml-2 h-4 w-4" />
                نص
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock('image')}
              >
                <Plus className="ml-2 h-4 w-4" />
                صورة
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock('button')}
              >
                <Plus className="ml-2 h-4 w-4" />
                زر
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock('columns')}
              >
                <Plus className="ml-2 h-4 w-4" />
                أعمدة
              </Button>
            </div>
          </div>
        )}

        {/* Canvas (سأكمله في الرسالة التالية بسبب الطول) */}
        <div className="flex-1 bg-muted/10 p-8 overflow-y-auto">
          <Card className="max-w-5xl mx-auto bg-white p-8 min-h-[600px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p className="text-lg mb-2">لا توجد بلوكات</p>
                    <p className="text-sm">اضغط على زر + من القائمة اليمنى لإضافة بلوك</p>
                  </div>
                ) : (
                  blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onUpdate={(updates: Partial<PageBlock>) => updateBlock(block.id, updates)}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </Card>
        </div>

        {/* Settings Panel */}
        {showSettingsPanel && selectedBlockId && (
          <div className="w-80 bg-muted/20 border-r p-4 overflow-y-auto">
            <h3 className="font-bold mb-4">الإعدادات</h3>
            <BlockSettings
              block={blocks.find((b) => b.id === selectedBlockId)!}
              onUpdate={(updates: Partial<PageBlock>) => updateBlock(selectedBlockId, updates)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getDefaultContent(type: string): any {
  const defaults: Record<string, any> = {
    heading: { headingText: 'عنوان جديد', headingTag: 'h2' },
    text: { text: '<p>اكتب نصك هنا...</p>' },
    image: { imageUrl: '/placeholder.jpg', imageAlt: 'صورة' },
    button: { buttonText: 'انقر هنا', buttonLink: '#' },
    columns: { columnCount: 2, columnGap: 20 },
  };
  return defaults[type] || {};
}

function getDefaultSettings(type: string): any {
  return {
    marginBottom: 20,
    fontSize: type === 'heading' ? 32 : 16,
    textAlign: 'right',
  };
}

function getWidgetName(type: string): string {
  const names: Record<string, string> = {
    heading: 'عنوان',
    text: 'نص',
    image: 'صورة',
    button: 'زر',
    columns: 'أعمدة',
  };
  return names[type] || type;
}

// BlockRenderer Component (placeholder - سأكمله لاحقاً)
function BlockRenderer({ block, isSelected, onSelect, onDelete, onDuplicate, onUpdate }: any) {
  return (
    <div
      className={`p-4 mb-4 border-2 rounded cursor-pointer ${
        isSelected ? 'border-primary' : 'border-transparent hover:border-muted-foreground/20'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{getWidgetName(block.type)}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDuplicate}>نسخ</Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>حذف</Button>
        </div>
      </div>
      {/* Render block content based on type */}
      <div style={block.settings}>
        {block.type === 'heading' && <h2>{block.content.headingText}</h2>}
        {block.type === 'text' && <div dangerouslySetInnerHTML={{ __html: block.content.text }} />}
        {block.type === 'image' && <img src={block.content.imageUrl} alt={block.content.imageAlt} className="w-full" />}
        {block.type === 'button' && <button className="px-4 py-2 bg-primary text-white rounded">{block.content.buttonText}</button>}
      </div>
    </div>
  );
}

// BlockSettings Component (placeholder - سأكمله لاحقاً)
function BlockSettings({ block, onUpdate }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">إعدادات {getWidgetName(block.type)}</p>
      {/* سأضيف controls للإعدادات لاحقاً */}
    </div>
  );
}
