'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye, FileText, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Page {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  parentId?: string | null;
  level: number;
  showInHeader: boolean;
  showInFooter: boolean;
  isPublished: boolean;
  order: number;
  createdAt: string;
}

export default function PagesManagementPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  const [formData, setFormData] = useState({
    titleAr: '',
    titleEn: '',
    slug: '',
    parentId: 'none',
    level: 1,
    order: 1,
    showInHeader: true,
    showInFooter: false,
    isPublished: false,
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const response = await fetch('/api/pages');
      if (!response.ok) throw new Error('Failed to load pages');
      
      const data = await response.json();
      setPages(data.pages);
    } catch (error) {
      console.error('Error loading pages:', error);
      setIsError(true);
      setErrorMessage('فشل في الاتصال بقاعدة البيانات — تحقق من إعدادات الاتصال');
      toast.error('فشل في تحميل الصفحات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setIsError(false);
    loadPages();
  };

  const generateSlug = (title: string) => {
    // Transliteration map for Arabic to English
    const arabicToEnglish: { [key: string]: string } = {
      'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
      'ب': 'b', 'ت': 't', 'ث': 'th',
      'ج': 'j', 'ح': 'h', 'خ': 'kh',
      'د': 'd', 'ذ': 'th', 'ر': 'r',
      'ز': 'z', 'س': 's', 'ش': 'sh',
      'ص': 's', 'ض': 'd', 'ط': 't',
      'ظ': 'z', 'ع': 'a', 'غ': 'gh',
      'ف': 'f', 'ق': 'q', 'ك': 'k',
      'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'y',
      'ى': 'a', 'ة': 'h', 'ء': 'a',
      ' ': '-', 'َ': '', 'ً': '', 'ُ': '',
      'ٌ': '', 'ِ': '', 'ٍ': '', 'ْ': '',
      'ّ': '', 'ـ': ''
    };

    let slug = title.toLowerCase().trim();
    
    // Convert Arabic characters to English
    slug = slug.split('').map(char => arabicToEnglish[char] || char).join('');
    
    // Remove any remaining non-alphanumeric characters except hyphens
    slug = slug
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/\-\-+/g, '-')
      .replace(/^\-+|\-+$/g, '');
    
    return slug || 'page';
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      titleAr: title,
      slug: generateSlug(title),
    });
  };

  const resetForm = () => {
    setFormData({
      titleAr: '',
      titleEn: '',
      slug: '',
      parentId: 'none',
      level: 1,
      order: pages.length + 1,
      showInHeader: true,
      showInFooter: false,
      isPublished: false,
    });
  };

  const handleAddPage = async () => {
    if (!formData.titleAr || !formData.titleEn || !formData.slug) {
      toast.error('يرجى إدخال العنوان والرابط');
      return;
    }

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId === 'none' ? null : formData.parentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create page');
      }

      const newPage = await response.json();
      toast.success('تمت إضافة الصفحة بنجاح');
      setIsAddDialogOpen(false);
      resetForm();
      
      // توجيه إلى Page Builder مباشرة
      if (newPage.page && newPage.page.id) {
        router.push(`/cms/page-builder-grapes/${newPage.page.id}`);
      } else {
        loadPages();
      }
    } catch (error: any) {
      console.error('Error creating page:', error);
      toast.error(error.message || 'فشل في إضافة الصفحة');
    }
  };

  const handleEditPage = async () => {
    if (!selectedPage || !formData.titleAr || !formData.titleEn) {
      toast.error('يرجى إدخال العنوان');
      return;
    }

    try {
      const response = await fetch(`/api/pages/${selectedPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId === 'none' ? null : formData.parentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update page');
      }

      toast.success('تم تحديث الصفحة بنجاح');
      setIsEditDialogOpen(false);
      setSelectedPage(null);
      resetForm();
      loadPages();
    } catch (error: any) {
      console.error('Error updating page:', error);
      toast.error(error.message || 'فشل في تحديث الصفحة');
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;

    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete page');
      }

      toast.success('تم حذف الصفحة بنجاح');
      loadPages();
    } catch (error: any) {
      console.error('Error deleting page:', error);
      toast.error(error.message || 'فشل في حذف الصفحة');
    }
  };

  const openEditDialog = (page: Page) => {
    setSelectedPage(page);
    setFormData({
      titleAr: page.titleAr,
      titleEn: page.titleEn,
      slug: page.slug,
      parentId: page.parentId || 'none',
      level: page.level,
      order: page.order,
      showInHeader: page.showInHeader,
      showInFooter: page.showInFooter,
      isPublished: page.isPublished,
    });
    setIsEditDialogOpen(true);
  };

  const openPageBuilder = (pageId: string) => {
    router.push(`/cms/page-builder-grapes/${pageId}`);
  };

  const parentPages = pages.filter((p) => p.parentId === null || p.parentId === undefined);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Info Card */}
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">🎨 نظام Page Builder المتطور - GrapesJS</h3>
              <p className="text-muted-foreground mb-3">
                نظام إدارة صفحات احترافي مع محرر GrapesJS. أنشئ صفحات احترافية بدون كتابة كود - مثل Elementor تماماً!
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ GrapesJS Builder</div>
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ 30+ Widget</div>
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ Live Preview</div>
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ Drag & Drop</div>
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ Responsive Design</div>
                <div className="px-3 py-1 bg-primary/10 rounded-full">✅ 3 مستويات للصفحات</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة الصفحات</h1>
          <p className="text-muted-foreground">أنشئ وعدّل الصفحات باستخدام Page Builder</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={resetForm}>
              <Plus className="ml-2 h-5 w-5" />
              إضافة صفحة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة صفحة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العنوان بالعربية *</Label>
                  <Input
                    value={formData.titleAr}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="مثال: الحياة الجامعية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>العنوان بالإنجليزية *</Label>
                  <Input
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="Campus Life"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="campus-life"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  سيكون الرابط: /{formData.slug || '...'}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>الصفحة الأب (اختياري)</Label>
                  <Select value={formData.parentId} onValueChange={(value) => setFormData({ ...formData, parentId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">لا يوجد (صفحة رئيسية)</SelectItem>
                      {parentPages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.titleAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={formData.isPublished ? 'published' : 'draft'} onValueChange={(value) => setFormData({ ...formData, isPublished: value === 'published' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="published">منشور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="showInHeader"
                    checked={formData.showInHeader}
                    onChange={(e) => setFormData({ ...formData, showInHeader: e.target.checked })}
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <Label htmlFor="showInHeader" className="cursor-pointer">إظهار في Header</Label>
                    <p className="text-xs text-muted-foreground">ستظهر في قائمة التنقل العلوية</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="showInFooter"
                    checked={formData.showInFooter}
                    onChange={(e) => setFormData({ ...formData, showInFooter: e.target.checked })}
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <Label htmlFor="showInFooter" className="cursor-pointer">إظهار في Footer</Label>
                    <p className="text-xs text-muted-foreground">ستظهر في أسفل الموقع</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={async () => {
                  await handleAddPage();
                  // سيتم توجيهك تلقائياً بعد الإضافة
                }}>
                  <Save className="ml-2 h-4 w-4" />
                  حفظ والبدء في التحرير
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pages List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-destructive font-bold text-2xl">!</span>
              </div>
              <h3 className="text-lg font-semibold text-destructive mb-2">خطأ في الاتصال</h3>
              <p className="text-destructive/80 mb-6">{errorMessage}</p>
              <Button variant="destructive" onClick={handleRetry}>
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد صفحات</h3>
              <p className="text-muted-foreground mb-4">ابدأ بإضافة صفحة جديدة الآن</p>
            </CardContent>
          </Card>
        ) : (
          pages
            .sort((a, b) => a.order - b.order)
            .map((page) => (
              <Card key={page.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{page.titleAr}</h3>
                        <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                          {page.isPublished ? 'منشور' : 'مسودة'}
                        </Badge>
                        {page.showInHeader && <Badge variant="outline">Header</Badge>}
                        {page.showInFooter && <Badge variant="outline">Footer</Badge>}
                        <Badge variant="outline">Level {page.level}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>/{page.slug}</span>
                        <span>الترتيب: {page.order}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openPageBuilder(page.id)}
                      >
                        <Edit2 className="ml-2 h-4 w-4" />
                        Page Builder
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/${page.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(page)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePage(page.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent key={selectedPage?.id || 'new'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الصفحة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* العنوان بالعربية */}
            <div>
              <Label htmlFor="edit-titleAr">العنوان بالعربية *</Label>
              <Input
                id="edit-titleAr"
                value={formData.titleAr}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                placeholder="مثال: عن المعهد"
                className="mt-1"
                dir="rtl"
              />
            </div>

            {/* العنوان بالإنجليزية */}
            <div>
              <Label htmlFor="edit-titleEn">العنوان بالإنجليزية *</Label>
              <Input
                id="edit-titleEn"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="Example: About Us"
                className="mt-1"
              />
            </div>

            {/* الرابط (Slug) */}
            <div>
              <Label htmlFor="edit-slug">الرابط (Slug) *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="about-us"
                className="mt-1"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                الرابط الذي سيظهر في المتصفح (استخدم حروف إنجليزية وشرطات فقط)
              </p>
            </div>

            {/* الصفحة الأب (اختياري) */}
            <div>
              <Label htmlFor="edit-parentId">الصفحة الأب (اختياري)</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger id="edit-parentId" className="mt-1">
                  <SelectValue placeholder="اختر الصفحة الأب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">لا يوجد (صفحة رئيسية)</SelectItem>
                  {parentPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.titleAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الترتيب */}
            <div>
              <Label htmlFor="edit-order">الترتيب</Label>
              <Input
                id="edit-order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                min="1"
                className="mt-1"
              />
            </div>

            {/* المستوى */}
            <div>
              <Label htmlFor="edit-level">المستوى</Label>
              <Select
                value={formData.level.toString()}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger id="edit-level" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">مستوى 1</SelectItem>
                  <SelectItem value="2">مستوى 2</SelectItem>
                  <SelectItem value="3">مستوى 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* خيارات العرض */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="edit-showInHeader"
                  checked={formData.showInHeader}
                  onChange={(e) => setFormData({ ...formData, showInHeader: e.target.checked })}
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <Label htmlFor="edit-showInHeader" className="cursor-pointer">إظهار في Header</Label>
                  <p className="text-xs text-muted-foreground">ستظهر في قائمة التنقل العلوية</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="edit-showInFooter"
                  checked={formData.showInFooter}
                  onChange={(e) => setFormData({ ...formData, showInFooter: e.target.checked })}
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <Label htmlFor="edit-showInFooter" className="cursor-pointer">إظهار في Footer</Label>
                  <p className="text-xs text-muted-foreground">ستظهر في أسفل الموقع</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="edit-isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <Label htmlFor="edit-isPublished" className="cursor-pointer">نشر الصفحة</Label>
                  <p className="text-xs text-muted-foreground">جعل الصفحة مرئية للزوار</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditPage}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
