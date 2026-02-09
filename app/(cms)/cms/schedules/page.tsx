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
import { Plus, Eye, Download, Calendar, Trash2, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Schedule {
  id: string;
  departmentId: string;
  department: Department;
  year: number;
  semester: string;
  academicYear: string;
  pdfUrl: string | null;
  isVisible: boolean;
  allowView: boolean;
  allowDownload: boolean;
  createdAt: string;
}

export default function SchedulesManagementPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    departmentId: '',
    year: 1,
    semester: 'FALL',
    academicYear: '2025-2026',
    pdfUrl: '',
    isVisible: true,
    allowView: true,
    allowDownload: true,
  });

  useEffect(() => {
    fetchSchedules();
    fetchDepartments();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules');
      const data = await response.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
      toast.error('فشل في جلب الجداول');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('فشل في جلب الأقسام');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('يُرجى اختيار ملف PDF أو صورة (JPG, PNG, GIF)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن لا يتجاوز 10 ميجابايت');
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview('');
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', selectedFile);
      fileFormData.append('type', 'schedules');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: fileFormData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('تم رفع الملف بنجاح');
        return data.url;
      } else {
        toast.error('فشل في رفع الملف');
        return null;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الملف');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('يُرجى اختيار ملف الجدول (PDF أو صورة)');
      return;
    }

    try {
      // Upload file first
      const fileUrl = await uploadFile();
      if (!fileUrl) return;

      // Create schedule with file URL
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, pdfUrl: fileUrl }),
      });

      if (response.ok) {
        toast.success('تم إضافة الجدول بنجاح');
        setIsDialogOpen(false);
        fetchSchedules();
        resetForm();
      } else {
        toast.error('فشل في إضافة الجدول');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجدول؟')) return;

    try {
      const response = await fetch('/api/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        toast.success('تم حذف الجدول');
        fetchSchedules();
      } else {
        toast.error('فشل في الحذف');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const toggleVisibility = async (id: string, field: 'isVisible' | 'allowView' | 'allowDownload', currentValue: boolean) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: !currentValue }),
      });

      if (response.ok) {
        toast.success('تم التحديث');
        fetchSchedules();
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
      pdfUrl: '',
      isVisible: true,
      allowView: true,
      allowDownload: true,
    });
    setSelectedFile(null);
    setFilePreview('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة جداول المحاضرات</h1>
          <p className="text-muted-foreground">إدارة جداول المحاضرات لجميع الفرق</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة جدول
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة جدول جديد</DialogTitle>
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
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.nameAr}
                        </SelectItem>
                      ))}
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
                <Label>رفع ملف الجدول *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="scheduleFile"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="scheduleFile" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-3">
                        {filePreview ? (
                          <div className="relative w-full h-48 bg-muted rounded overflow-hidden">
                            <img 
                              src={filePreview} 
                              alt="Preview" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <FileText className="w-16 h-16 mx-auto text-primary" />
                        )}
                        <div>
                          <p className="font-medium text-primary">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setSelectedFile(null);
                          setFilePreview('');
                        }}>
                          <Trash2 className="h-4 w-4 ml-2" />
                          إزالة الملف
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium">اضغط لاختيار ملف</p>
                          <p className="text-sm text-muted-foreground">
                            PDF أو صورة (JPG, PNG, GIF) - حتى 10 MB
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
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
                <Button type="submit" className="flex-1" disabled={uploading || !selectedFile}>
                  {uploading ? (
                    <>
                      <Upload className="ml-2 h-4 w-4 animate-pulse" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة الجدول
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }} 
                  className="flex-1"
                  disabled={uploading}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الجداول ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد جداول حالياً
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
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.department?.nameAr || 'غير محدد'}
                    </TableCell>
                    <TableCell>الفرقة {schedule.year}</TableCell>
                    <TableCell>
                      {schedule.semester === 'FALL' ? 'الأول' : 'الثاني'}
                    </TableCell>
                    <TableCell>{schedule.academicYear}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={schedule.isVisible ? 'default' : 'secondary'}>
                          {schedule.isVisible ? 'معروض' : 'مخفي'}
                        </Badge>
                        {schedule.allowView && (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 ml-1" />
                            عرض
                          </Badge>
                        )}
                        {schedule.allowDownload && (
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
                          onClick={() => toggleVisibility(schedule.id, 'isVisible', schedule.isVisible)}
                        >
                          {schedule.isVisible ? 'إخفاء' : 'عرض'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(schedule.id)}
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
