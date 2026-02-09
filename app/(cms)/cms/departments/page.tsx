'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  requiredHours: number;
  _count: {
    specializations: number;
  };
}

export default function DepartmentsManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    requiredHours: 144,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
      toast.error('فشل في جلب الأقسام');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('تم إضافة القسم بنجاح');
        setIsDialogOpen(false);
        setFormData({ name: '', code: '', description: '', requiredHours: 144 });
        fetchDepartments();
      } else {
        toast.error('فشل في إضافة القسم');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;

    try {
      const response = await fetch(`/api/departments?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف القسم بنجاح');
        fetchDepartments();
      } else {
        toast.error('فشل في حذف القسم');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">إدارة الأقسام العلمية</h1>
          <p className="text-muted-foreground">إضافة وتعديل وحذف الأقسام</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة قسم جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة قسم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">اسم القسم</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: إدارة الضيافة"
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">كود القسم</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="مثال: HM"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف القسم..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="requiredHours">الساعات المطلوبة</Label>
                <Input
                  id="requiredHours"
                  type="number"
                  value={formData.requiredHours}
                  onChange={(e) => setFormData({ ...formData, requiredHours: parseInt(e.target.value) })}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                إضافة القسم
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الأقسام..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>اسم القسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الساعات المطلوبة</TableHead>
                  <TableHead>التخصصات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      لا توجد أقسام
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono">{dept.code}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {dept.description || '-'}
                      </TableCell>
                      <TableCell>{dept.requiredHours} ساعة</TableCell>
                      <TableCell>{dept._count.specializations}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(dept.id)}
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
