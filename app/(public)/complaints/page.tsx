'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Info, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ComplaintsPage() {
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    email: '',
    phone: '',
    type: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentName || !formData.phone || !formData.type || !formData.subject || !formData.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('تم إرسال شكواك بنجاح! سيتم الرد عليك قريباً');
        setSubmitted(true);
        setFormData({
          studentName: '',
          studentId: '',
          email: '',
          phone: '',
          type: '',
          subject: '',
          message: '',
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'فشل في إرسال الشكوى');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الشكوى');
    } finally {
      setLoading(false);
    }
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
          <Badge className="mb-4 text-lg px-4 py-1">الشكاوى والمقترحات</Badge>
          <h1 className="text-5xl font-bold mb-6">قدم شكوى</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            نحن نهتم بآرائكم ونسعى لتحسين خدماتنا بشكل مستمر
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="mb-6 bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">ملاحظات مهمة</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• سيتم التعامل مع جميع الشكاوى بسرية تامة</li>
                    <li>• سيتم الرد على شكواك خلال 3-5 أيام عمل</li>
                    <li>• يمكنك متابعة شكواك باستخدام رقم التتبع</li>
                    <li>• الشكاوى الكيدية سيتم اتخاذ الإجراءات القانونية بشأنها</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {submitted ? (
            <Card className="text-center p-12">
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-4">تم إرسال شكواك بنجاح!</h2>
                <p className="text-xl text-muted-foreground mb-6">
                  شكراً لثقتك بنا. سيتم مراجعة شكواك والرد عليك في أقرب وقت ممكن
                </p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  size="lg"
                >
                  إرسال شكوى أخرى
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-2xl">نموذج الشكوى</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل *</Label>
                      <Input 
                        id="name" 
                        placeholder="أدخل اسمك" 
                        value={formData.studentName}
                        onChange={(e) => handleChange('studentName', e.target.value)}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentId">الرقم الأكاديمي (اختياري)</Label>
                      <Input 
                        id="studentId" 
                        placeholder="للطلاب فقط"
                        value={formData.studentId}
                        onChange={(e) => handleChange('studentId', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم التليفون *</Label>
                      <Input 
                        id="phone" 
                        placeholder="01XXXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">نوع الشكوى *</Label>
                    <Select 
                      value={formData.type}
                      onValueChange={(value) => handleChange('type', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الشكوى" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACADEMIC">شكوى أكاديمية</SelectItem>
                        <SelectItem value="ADMINISTRATIVE">شكوى إدارية</SelectItem>
                        <SelectItem value="FINANCIAL">شكوى مالية</SelectItem>
                        <SelectItem value="TECHNICAL">المرافق والخدمات</SelectItem>
                        <SelectItem value="OTHER">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">موضوع الشكوى *</Label>
                    <Input 
                      id="subject" 
                      placeholder="عنوان مختصر للشكوى"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">تفاصيل الشكوى *</Label>
                    <Textarea
                      id="message"
                      placeholder="اشرح شكواك بالتفصيل..."
                      rows={6}
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>جاري الإرسال...</>
                    ) : (
                      <>
                        <Send className="ml-2 h-5 w-5" />
                        إرسال الشكوى
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                    بإرسال هذا النموذج، أنت توافق على{' '}
                    <a href="#" className="text-primary hover:underline">
                      سياسة الخصوصية
                    </a>
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
