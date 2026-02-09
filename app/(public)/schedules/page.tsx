'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Calendar, Clock, Eye, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export default function SchedulesPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSchedules = async () => {
    if (!department || !year) {
      toast.error('يُرجى اختيار القسم والفرقة');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?departmentId=${department}&year=${year}`);
      if (response.ok) {
        const data = await response.json();
        const visibleSchedules = data.filter((s: Schedule) => s.isVisible);
        setSchedules(visibleSchedules);
        
        if (visibleSchedules.length === 0) {
          toast('لا توجد جداول متاحة حالياً', { icon: 'ℹ️' });
        }
      } else {
        toast.error('فشل في جلب الجداول');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('حدث خطأ أثناء جلب الجداول');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSchedule = (schedule: Schedule) => {
    if (!schedule.allowView) {
      toast.error('عرض هذا الجدول غير متاح');
      return;
    }
    setSelectedSchedule(schedule);
    setViewDialogOpen(true);
  };

  const handleDownloadSchedule = (schedule: Schedule) => {
    if (!schedule.allowDownload) {
      toast.error('تحميل هذا الجدول غير متاح');
      return;
    }
    if (schedule.pdfUrl) {
      window.open(schedule.pdfUrl, '_blank');
    }
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isPdfFile = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  return (
    <div className="pt-32 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 text-lg px-4 py-1">جداول المحاضرات</Badge>
          <h1 className="text-5xl font-bold mb-6">الجداول الدراسية</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            تصفح جداول المحاضرات لجميع الأقسام والفرق الدراسية
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">اختر القسم والفرقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={department} onValueChange={(value) => {
                  setDepartment(value);
                  setSchedules([]);
                }}>
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
                <Label>الفرقة</Label>
                <Select value={year} onValueChange={(value) => {
                  setYear(value);
                  setSchedules([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفرقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">الفرقة الأولى</SelectItem>
                    <SelectItem value="2">الفرقة الثانية</SelectItem>
                    <SelectItem value="3">الفرقة الثالثة</SelectItem>
                    <SelectItem value="4">الفرقة الرابعة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                disabled={!department || !year || loading}
                onClick={fetchSchedules}
              >
                <Calendar className="ml-2 h-5 w-5" />
                {loading ? 'جاري البحث...' : 'عرض الجداول'}
              </Button>

              {schedules.length > 0 && (
                <div className="pt-6 border-t">
                  <h3 className="font-semibold mb-4">
                    الجداول المتاحة ({schedules.length})
                  </h3>
                  <div className="grid gap-3">
                    {schedules.map((schedule) => (
                      <Card key={schedule.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {schedule.pdfUrl && (
                                  isImageFile(schedule.pdfUrl) ? (
                                    <ImageIcon className="h-5 w-5 text-primary" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-primary" />
                                  )
                                )}
                                <h4 className="font-semibold">
                                  {schedule.department.nameAr} - الفرقة {schedule.year}
                                </h4>
                              </div>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">
                                  {schedule.semester === 'FALL' ? 'الفصل الأول' : 'الفصل الثاني'}
                                </Badge>
                                <Badge variant="outline">
                                  {schedule.academicYear}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {schedule.allowView && schedule.pdfUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewSchedule(schedule)}
                                >
                                  <Eye className="h-4 w-4 ml-1" />
                                  عرض
                                </Button>
                              )}
                              {schedule.allowDownload && schedule.pdfUrl && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadSchedule(schedule)}
                                >
                                  <Download className="h-4 w-4 ml-1" />
                                  تحميل
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-8 bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">معلومات مهمة</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• الجداول قابلة للتحديث حسب الظروف الطارئة</li>
                    <li>• يُرجى متابعة الموقع بانتظام للاطلاع على أي تغييرات</li>
                    <li>• مواعيد المحاضرات قد تختلف في حالة الامتحانات</li>
                    <li>• للاستفسارات، يرجى التواصل مع شؤون الطلاب</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dialog for viewing schedule */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {selectedSchedule?.department.nameAr} - الفرقة {selectedSchedule?.year}
                </span>
                {selectedSchedule?.pdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(selectedSchedule.pdfUrl!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 ml-2" />
                    فتح في نافذة جديدة
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedSchedule?.pdfUrl && (
                <div className="w-full">
                  {isImageFile(selectedSchedule.pdfUrl) ? (
                    <img
                      src={selectedSchedule.pdfUrl}
                      alt="Schedule"
                      className="w-full h-auto rounded-lg border"
                    />
                  ) : isPdfFile(selectedSchedule.pdfUrl) ? (
                    <iframe
                      src={selectedSchedule.pdfUrl}
                      className="w-full h-[600px] rounded-lg border"
                      title="PDF Viewer"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>نوع الملف غير مدعوم للعرض</p>
                      <Button
                        className="mt-4"
                        onClick={() => window.open(selectedSchedule.pdfUrl!, '_blank')}
                      >
                        <Download className="ml-2 h-4 w-4" />
                        تحميل الملف
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
