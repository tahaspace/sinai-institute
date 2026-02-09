'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Upload, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Result {
  id: string;
  departmentId: string;
  department: { name: string };
  year: number;
  semester: string;
  academicYear: string;
  pdfUrl: string | null;
  isVisible: boolean;
  allowView: boolean;
  allowDownload: boolean;
  createdAt: string;
}

export default function ResultsManagementPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    departmentId: '',
    year: 1,
    semester: 'FALL',
    academicYear: '2025-2026',
    isVisible: true,
    allowView: true,
    allowDownload: true,
  });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults([]);
      toast.error('فشل في جلب النتائج');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('تم إضافة النتيجة بنجاح');
        setIsDialogOpen(false);
        fetchResults();
        resetForm();
      } else {
        toast.error('فشل في إضافة النتيجة');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;

    try {
      const response = await fetch('/api/results', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success('تم حذف النتيجة');
        fetchResults();
      } else {
        toast.error('فشل في الحذف');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const toggleVisibility = async (id: string, field: 'isVisible' | 'allowView' | 'allowDownload', currentValue: boolean) => {
    try {
      const response = await fetch('/api/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: !currentValue }),
      });

      if (response.ok) {
        toast.success('تم التحديث');
        fetchResults();
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const resetForm = () => {
    setFormData({
      departmentId: '',
      year: 1,
      semester: 'FALL',
      academicYear: '2025-2026',
      isVisible: true,
      allowView: true,
      allowDownload: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة النتائج</h1>
          <p className="text-muted-foreground">إدارة نتائج الامتحانات لجميع الفرق</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة نتيجة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة نتيجة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>القسم *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dept1">إدارة ضيافة</SelectItem>
                      <SelectItem value="dept2">إرشاد سياحي</SelectItem>
                      <SelectItem value="dept3">دراسات سياحية</SelectItem>
                      <SelectItem value="dept4">إنجليزي</SelectItem>
                      <SelectItem value="dept5">فرنسي</SelectItem>
                      <SelectItem value="dept6">علوم إدارية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفرقة *</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">الفرقة الأولى</SelectItem>
                      <SelectItem value="2">الفرقة الثانية</SelectItem>
                      <SelectItem value="3">الفرقة الثالثة</SelectItem>
                      <SelectItem value="4">الفرقة الرابعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الفصل الدراسي *</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FALL">الفصل الدراسي الأول</SelectItem>
                      <SelectItem value="SPRING">الفصل الدراسي الثاني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>السنة الأكاديمية *</Label>
                  <Input
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2025-2026"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label>خيارات العرض</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isVisible"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isVisible" className="cursor-pointer">عرض للطلاب</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowView"
                    checked={formData.allowView}
                    onChange={(e) => setFormData({ ...formData, allowView: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="allowView" className="cursor-pointer">السماح بالعرض</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowDownload"
                    checked={formData.allowDownload}
                    onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="allowDownload" className="cursor-pointer">السماح بالتحميل</Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">إضافة</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع النتائج ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد نتائج حالياً
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>القسم</TableHead>
                  <TableHead>الفرقة</TableHead>
                  <TableHead>الفصل الدراسي</TableHead>
                  <TableHead>السنة الأكاديمية</TableHead>
                  <TableHead>العرض</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">
                      {result.department?.name || 'غير محدد'}
                    </TableCell>
                    <TableCell>الفرقة {result.year}</TableCell>
                    <TableCell>
                      {result.semester === 'FALL' ? 'الأول' : 'الثاني'}
                    </TableCell>
                    <TableCell>{result.academicYear}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={result.isVisible ? 'default' : 'secondary'}>
                          {result.isVisible ? 'معروض' : 'مخفي'}
                        </Badge>
                        {result.allowView && (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 ml-1" />
                            عرض
                          </Badge>
                        )}
                        {result.allowDownload && (
                          <Badge variant="outline">
                            <Download className="h-3 w-3 ml-1" />
                            تحميل
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleVisibility(result.id, 'isVisible', result.isVisible)}
                        >
                          {result.isVisible ? 'إخفاء' : 'عرض'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(result.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
