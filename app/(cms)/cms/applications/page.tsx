'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, CheckCircle, XCircle, Clock, User, Phone, Mail, MapPin, GraduationCap, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Application {
  id: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  highSchoolGrade: number;
  highSchoolYear: number;
  firstChoice: string;
  secondChoice: string | null;
  thirdChoice: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function ApplicationsManagementPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      const url = filter === 'ALL' 
        ? '/api/applications' 
        : `/api/applications?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      toast.error('فشل في جلب الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        toast.success('تم تحديث الحالة بنجاح');
        fetchApplications();
      } else {
        toast.error('فشل في تحديث الحالة');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'secondary', label: 'قيد المراجعة', icon: Clock },
      ACCEPTED: { variant: 'default', label: 'مقبول', icon: CheckCircle },
      REJECTED: { variant: 'destructive', label: 'مرفوض', icon: XCircle },
    };
    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="ml-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApplication(app);
    setShowDetailsDialog(true);
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'PENDING').length,
    accepted: applications.filter(a => a.status === 'ACCEPTED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">إدارة طلبات التقديم</h1>
        <p className="text-muted-foreground">مراجعة وقبول/رفض طلبات الطلاب</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المقبولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المرفوضة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الطلبات</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">جميع الطلبات</SelectItem>
                <SelectItem value="PENDING">قيد المراجعة</SelectItem>
                <SelectItem value="ACCEPTED">المقبولة</SelectItem>
                <SelectItem value="REJECTED">المرفوضة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>رقم التليفون</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الاختيار الأول</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.fullName}</TableCell>
                      <TableCell dir="ltr" className="text-right">{app.phone}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{app.firstChoice}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewDetails(app)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {app.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateStatus(app.id, 'ACCEPTED')}
                              >
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus(app.id, 'REJECTED')}
                              >
                                رفض
                              </Button>
                            </>
                          )}
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

      {/* Dialog لعرض تفاصيل الطلب */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">تفاصيل طلب التقديم</DialogTitle>
            <DialogDescription>
              جميع المعلومات المقدمة من الطالب
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 mt-4">
              {/* الحالة */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <span className="text-sm text-muted-foreground">حالة الطلب</span>
                </div>
                <div>{getStatusBadge(selectedApplication.status)}</div>
              </div>

              {/* البيانات الشخصية */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  البيانات الشخصية
                </h3>
                <div className="grid md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">الاسم الكامل</span>
                    <p className="font-medium mt-1">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">الرقم القومي</span>
                    <p className="font-medium mt-1" dir="ltr">{selectedApplication.nationalId}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      تاريخ الميلاد
                    </span>
                    <p className="font-medium mt-1">
                      {new Date(selectedApplication.birthDate).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      رقم التليفون
                    </span>
                    <p className="font-medium mt-1" dir="ltr">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      البريد الإلكتروني
                    </span>
                    <p className="font-medium mt-1">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      العنوان
                    </span>
                    <p className="font-medium mt-1">{selectedApplication.address}</p>
                  </div>
                </div>
              </div>

              {/* بيانات الثانوية العامة */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  بيانات الثانوية العامة
                </h3>
                <div className="grid md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">المجموع</span>
                    <p className="font-medium mt-1 text-lg">
                      {selectedApplication.highSchoolGrade} / 410
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">النسبة المئوية</span>
                    <p className="font-medium mt-1 text-lg">
                      {((selectedApplication.highSchoolGrade / 410) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">سنة الحصول</span>
                    <p className="font-medium mt-1">{selectedApplication.highSchoolYear}</p>
                  </div>
                </div>
              </div>

              {/* اختيارات التخصص */}
              <div>
                <h3 className="text-lg font-semibold mb-4">اختيارات التخصص</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border-r-4 border-primary">
                    <span className="text-sm font-semibold">الرغبة الأولى:</span>
                    <span className="font-medium">{selectedApplication.firstChoice}</span>
                  </div>
                  {selectedApplication.secondChoice && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border-r-4 border-muted">
                      <span className="text-sm font-semibold">الرغبة الثانية:</span>
                      <span className="font-medium">{selectedApplication.secondChoice}</span>
                    </div>
                  )}
                  {selectedApplication.thirdChoice && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border-r-4 border-muted">
                      <span className="text-sm font-semibold">الرغبة الثالثة:</span>
                      <span className="font-medium">{selectedApplication.thirdChoice}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات إضافية */}
              <div>
                <h3 className="text-lg font-semibold mb-4">معلومات إضافية</h3>
                <div className="grid md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">تاريخ التقديم</span>
                    <p className="font-medium mt-1">
                      {new Date(selectedApplication.createdAt).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">رقم الطلب</span>
                    <p className="font-medium mt-1 text-xs">{selectedApplication.id}</p>
                  </div>
                </div>
              </div>

              {/* الملاحظات */}
              {selectedApplication.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">ملاحظات</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">{selectedApplication.notes}</p>
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedApplication.status === 'PENDING' && (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        updateStatus(selectedApplication.id, 'ACCEPTED');
                        setShowDetailsDialog(false);
                      }}
                    >
                      <CheckCircle className="ml-2 h-4 w-4" />
                      قبول الطلب
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        updateStatus(selectedApplication.id, 'REJECTED');
                        setShowDetailsDialog(false);
                      }}
                    >
                      <XCircle className="ml-2 h-4 w-4" />
                      رفض الطلب
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
