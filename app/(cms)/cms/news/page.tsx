'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface News {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  published: boolean;
  featured: boolean;
  showInSlider: boolean;
  showInTicker: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsManagementPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'GENERAL',
    published: true,
    featured: false,
    showInSlider: false,
    showInTicker: true,
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news');
      const data = await response.json();
      setNews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([]);
      toast.error('فشل في جلب الأخبار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('تم إضافة الخبر بنجاح');
        setIsDialogOpen(false);
        setFormData({
          title: '',
          summary: '',
          content: '',
          category: 'GENERAL',
          published: true,
          featured: false,
          showInSlider: false,
          showInTicker: true,
        });
        fetchNews();
      } else {
        toast.error('فشل في إضافة الخبر');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;

    try {
      const response = await fetch(`/api/news?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف الخبر بنجاح');
        fetchNews();
      } else {
        toast.error('فشل في حذف الخبر');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, published: !currentStatus }),
      });

      if (response.ok) {
        toast.success('تم تحديث حالة النشر');
        fetchNews();
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      GENERAL: 'عام',
      ACADEMIC: 'أكاديمي',
      EVENTS: 'فعاليات',
      ADMISSION: 'قبول',
      EXAMS: 'امتحانات',
      ANNOUNCEMENTS: 'إعلانات',
    };
    return labels[category] || category;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة الأخبار</h1>
          <p className="text-muted-foreground">إدارة أخبار المعهد والإعلانات</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة خبر جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة خبر جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان الخبر</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان الخبر..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="summary">ملخص</Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="ملخص قصير للخبر..."
                />
              </div>

              <div>
                <Label htmlFor="content">المحتوى</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="محتوى الخبر..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">التصنيف</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">عام</SelectItem>
                    <SelectItem value="ACADEMIC">أكاديمي</SelectItem>
                    <SelectItem value="EVENTS">فعاليات</SelectItem>
                    <SelectItem value="ADMISSION">قبول</SelectItem>
                    <SelectItem value="EXAMS">امتحانات</SelectItem>
                    <SelectItem value="ANNOUNCEMENTS">إعلانات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>نشر الخبر</Label>
                  <Switch
                    checked={formData.published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, published: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>خبر مميز</Label>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, featured: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>عرض في السلايدر</Label>
                  <Switch
                    checked={formData.showInSlider}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showInSlider: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>عرض في الشريط الإخباري</Label>
                  <Switch
                    checked={formData.showInTicker}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showInTicker: checked })
                    }
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                إضافة الخبر
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المميزات</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      لا توجد أخبار
                    </TableCell>
                  </TableRow>
                ) : (
                  news.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.published ? 'default' : 'secondary'}>
                          {item.published ? 'منشور' : 'مسودة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.featured && <Badge variant="outline">مميز</Badge>}
                          {item.showInSlider && <Badge variant="outline">Slider</Badge>}
                          {item.showInTicker && <Badge variant="outline">Ticker</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePublished(item.id, item.published)}
                          >
                            {item.published ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
