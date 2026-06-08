'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/contact-messages');
        if (!res.ok) throw new Error('فشل تحميل البيانات');
        const json = await res.json();
        if (!cancelled) {
          setMessages(Array.isArray(json) ? json : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          toast.error('فشل في جلب الرسائل');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);
  };

  const stats = {
    total: messages.length,
    unread: messages.filter((m) => !m.isRead).length,
    today: messages.filter(
      (m) => new Date(m.createdAt).toDateString() === new Date().toDateString()
    ).length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">الرسائل</h1>
        <p className="text-muted-foreground">رسائل اتصل بنا من الموقع</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <CardContent className="py-4 text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرسائل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">غير مقروءة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع الرسائل</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جارٍ التحميل...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد رسائل حالياً</p>
              <p className="text-sm mt-2">سيتم عرض رسائل اتصل بنا هنا</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-medium">{message.name}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {message.email}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {message.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={message.isRead ? 'outline' : 'default'}>
                        {message.isRead ? 'مقروءة' : 'غير مقروءة'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(message)}
                      >
                        <Eye className="h-3 w-3 ml-1" />
                        عرض
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الرسالة</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">الاسم</div>
                  <div className="font-medium">{selectedMessage.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</div>
                  <div dir="ltr" className="text-right font-medium">{selectedMessage.email}</div>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">رقم التليفون</div>
                    <div dir="ltr" className="text-right font-medium">{selectedMessage.phone}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">الحالة</div>
                  <Badge variant={selectedMessage.isRead ? 'outline' : 'default'}>
                    {selectedMessage.isRead ? 'مقروءة' : 'غير مقروءة'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">تاريخ الإرسال</div>
                  <div>{new Date(selectedMessage.createdAt).toLocaleString('ar-EG')}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">الموضوع</div>
                <div>{selectedMessage.subject}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">الرسالة</div>
                <div className="p-3 bg-muted rounded-lg">
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.response && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">الرد المرسل</div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    {selectedMessage.response}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
