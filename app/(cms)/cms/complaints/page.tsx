'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, MessageSquare, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Complaint {
  id: string;
  studentName: string;
  studentId: string | null;
  phone: string;
  email: string | null;
  type: string;
  subject: string;
  message: string;
  status: string;
  response: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export default function ComplaintsManagementPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      const url = filter === 'ALL' 
        ? '/api/complaints' 
        : `/api/complaints?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
      toast.error('فشل في جلب الشكاوى');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedComplaint || !response.trim()) {
      toast.error('يرجى كتابة الرد');
      return;
    }

    try {
      const res = await fetch('/api/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedComplaint.id,
          status: 'RESOLVED',
          response,
        }),
      });

      if (res.ok) {
        toast.success('تم إرسال الرد بنجاح');
        setIsDialogOpen(false);
        setResponse('');
        setSelectedComplaint(null);
        fetchComplaints();
      } else {
        toast.error('فشل في إرسال الرد');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const openDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponse(complaint.response || '');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'secondary', label: 'معلقة' },
      IN_PROGRESS: { variant: 'default', label: 'قيد المعالجة' },
      RESOLVED: { variant: 'outline', label: 'تم الحل' },
    };
    const config = variants[status] || variants.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACADEMIC: 'أكاديمي',
      ADMINISTRATIVE: 'إداري',
      FINANCIAL: 'مالي',
      TECHNICAL: 'تقني',
      OTHER: 'أخرى',
    };
    return labels[type] || type;
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">إدارة الشكاوى</h1>
        <p className="text-muted-foreground">معالجة والرد على شكاوى الطلاب</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الشكاوى</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">معلقة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">قيد المعالجة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">محلولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الشكاوى</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">جميع الشكاوى</SelectItem>
                <SelectItem value="PENDING">معلقة</SelectItem>
                <SelectItem value="IN_PROGRESS">قيد المعالجة</SelectItem>
                <SelectItem value="RESOLVED">محلولة</SelectItem>
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
                  <TableHead>النوع</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      لا توجد شكاوى
                    </TableCell>
                  </TableRow>
                ) : (
                  complaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="font-medium">
                        {complaint.studentName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeLabel(complaint.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {complaint.subject}
                      </TableCell>
                      <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(complaint.createdAt).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(complaint)}
                          >
                            <Eye className="h-3 w-3 ml-1" />
                            عرض
                          </Button>
                          {complaint.status !== 'RESOLVED' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openDialog(complaint)}
                            >
                              <MessageSquare className="h-3 w-3 ml-1" />
                              رد
                            </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الشكوى</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">الاسم</div>
                  <div className="font-medium">{selectedComplaint.studentName}</div>
                </div>
                {selectedComplaint.studentId && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">الرقم الأكاديمي</div>
                    <div className="font-medium">{selectedComplaint.studentId}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">رقم التليفون</div>
                  <div dir="ltr" className="text-right font-medium">{selectedComplaint.phone}</div>
                </div>
                {selectedComplaint.email && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</div>
                    <div dir="ltr" className="text-right font-medium">{selectedComplaint.email}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">النوع</div>
                  <div>{getTypeLabel(selectedComplaint.type)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">الحالة</div>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">تاريخ التقديم</div>
                  <div>{new Date(selectedComplaint.createdAt).toLocaleString('ar-EG')}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">الموضوع</div>
                <div>{selectedComplaint.subject}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">الرسالة</div>
                <div className="p-3 bg-muted rounded-lg">
                  {selectedComplaint.message}
                </div>
              </div>

              {selectedComplaint.status !== 'RESOLVED' && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">الرد</div>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={4}
                  />
                  <Button
                    className="mt-3 w-full"
                    onClick={handleRespond}
                  >
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                    إرسال الرد وحل الشكوى
                  </Button>
                </div>
              )}

              {selectedComplaint.response && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">الرد المرسل</div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    {selectedComplaint.response}
                  </div>
                  {selectedComplaint.respondedAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      تم الرد في: {new Date(selectedComplaint.respondedAt).toLocaleString('ar-EG')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
