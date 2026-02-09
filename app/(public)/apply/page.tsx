'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, User, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 3;

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [birthDate, setBirthDate] = useState<Date>();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    address: '',
    highSchoolGrade: '',
    highSchoolYear: '',
    firstChoice: '',
    secondChoice: '',
    thirdChoice: '',
  });

  const departments = [
    { value: 'إدارة ضيافة', label: 'إدارة ضيافة' },
    { value: 'إرشاد سياحي', label: 'إرشاد سياحي' },
    { value: 'دراسات سياحية', label: 'دراسات سياحية' },
    { value: 'إنجليزي', label: 'اللغة الإنجليزية' },
    { value: 'فرنسي', label: 'اللغة الفرنسية' },
    { value: 'محاسبة', label: 'المحاسبة' },
    { value: 'تسويق', label: 'التسويق' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.nationalId || !birthDate || !formData.phone || 
        !formData.email || !formData.address) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return false;
    }

    if (formData.nationalId.length !== 14) {
      toast.error('الرقم القومي يجب أن يكون 14 رقم');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('يرجى إدخال بريد إلكتروني صحيح');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.highSchoolGrade || !formData.highSchoolYear) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return false;
    }

    const grade = parseFloat(formData.highSchoolGrade);
    if (isNaN(grade) || grade < 0 || grade > 410) {
      toast.error('يرجى إدخال مجموع صحيح بين 0 و 410');
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (!formData.firstChoice) {
      toast.error('يرجى اختيار الرغبة الأولى على الأقل');
      return false;
    }

    if (!agreedToTerms) {
      toast.error('يرجى الموافقة على الشروط والأحكام');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          birthDate: birthDate!.toISOString(),
          highSchoolGrade: parseFloat(formData.highSchoolGrade),
          highSchoolYear: parseInt(formData.highSchoolYear),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً');
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPercentage = () => {
    const grade = parseFloat(formData.highSchoolGrade);
    if (isNaN(grade)) return 0;
    return ((grade / 410) * 100).toFixed(2);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto text-center"
          >
            <Card className="border-2 border-green-500 shadow-xl">
              <CardHeader className="pb-8">
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-3xl text-green-700">تم إرسال طلبك بنجاح!</CardTitle>
                <CardDescription className="text-lg mt-4">
                  شكراً لتقديمك طلب الالتحاق بالمعهد. سيتم مراجعة طلبك والتواصل معك قريباً.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-6 rounded-lg text-right">
                  <h3 className="font-bold text-lg mb-3 text-blue-900">الخطوات القادمة:</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>سيتم مراجعة طلبك خلال 3-5 أيام عمل</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>سنتواصل معك عبر البريد الإلكتروني أو الهاتف</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>تأكد من مراجعة بريدك الإلكتروني بانتظام</span>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    onClick={() => {
                      setIsSuccess(false);
                      setCurrentStep(1);
                      setFormData({
                        fullName: '',
                        nationalId: '',
                        phone: '',
                        email: '',
                        address: '',
                        highSchoolGrade: '',
                        highSchoolYear: '',
                        firstChoice: '',
                        secondChoice: '',
                        thirdChoice: '',
                      });
                      setBirthDate(undefined);
                      setAgreedToTerms(false);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    تقديم طلب آخر
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/')}
                    size="lg"
                  >
                    العودة للصفحة الرئيسية
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            التقديم للالتحاق بالمعهد
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            املأ النموذج التالي بعناية لتقديم طلب الالتحاق بالمعهد العالي للدراسات النوعية
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all',
                      step === currentStep
                        ? 'bg-blue-600 text-white scale-110 shadow-lg'
                        : step < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  <span className="text-xs mt-2 text-center font-medium">
                    {step === 1 && 'البيانات الشخصية'}
                    {step === 2 && 'الثانوية العامة'}
                    {step === 3 && 'اختيار التخصص'}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-2 transition-all',
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl flex items-center gap-2">
                {currentStep === 1 && <><User className="w-6 h-6" /> البيانات الشخصية</>}
                {currentStep === 2 && <><GraduationCap className="w-6 h-6" /> بيانات الثانوية العامة</>}
                {currentStep === 3 && <><FileText className="w-6 h-6" /> اختيار التخصص</>}
              </CardTitle>
              <CardDescription className="text-blue-100">
                الخطوة {currentStep} من {TOTAL_STEPS}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-right flex items-center gap-1">
                          الاسم الكامل (رباعي) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="مثال: أحمد محمد علي حسن"
                          className="text-right"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nationalId" className="text-right flex items-center gap-1">
                          الرقم القومي <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nationalId"
                          value={formData.nationalId}
                          onChange={(e) => handleInputChange('nationalId', e.target.value)}
                          placeholder="14 رقم"
                          maxLength={14}
                          className="text-right"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-right flex items-center gap-1">
                          تاريخ الميلاد <span className="text-red-500">*</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-between text-right font-normal',
                                !birthDate && 'text-muted-foreground'
                              )}
                            >
                              {birthDate ? format(birthDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                              <CalendarIcon className="ml-2 h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={birthDate}
                              onSelect={setBirthDate}
                              initialFocus
                              locale={ar}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-right flex items-center gap-1">
                          رقم الهاتف <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="01xxxxxxxxx"
                          className="text-right"
                          required
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-right flex items-center gap-1">
                          البريد الإلكتروني <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="example@email.com"
                          className="text-right"
                          required
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="text-right flex items-center gap-1">
                          العنوان الكامل <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          placeholder="المحافظة - المدينة - العنوان التفصيلي"
                          className="text-right"
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: High School Information */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="highSchoolGrade" className="text-right flex items-center gap-1">
                          مجموع الثانوية العامة (من 410) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="highSchoolGrade"
                          type="number"
                          step="0.5"
                          min="0"
                          max="410"
                          value={formData.highSchoolGrade}
                          onChange={(e) => handleInputChange('highSchoolGrade', e.target.value)}
                          placeholder="مثال: 380"
                          className="text-right"
                          required
                        />
                        {formData.highSchoolGrade && (
                          <p className="text-sm text-green-600 font-medium">
                            النسبة المئوية: {getPercentage()}%
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="highSchoolYear" className="text-right flex items-center gap-1">
                          سنة التخرج <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.highSchoolYear}
                          onValueChange={(value) => handleInputChange('highSchoolYear', value)}
                          required
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر السنة" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-right">
                      <h4 className="font-bold text-blue-900 mb-2">📌 ملاحظة هامة</h4>
                      <p className="text-sm text-blue-800">
                        يرجى التأكد من إدخال مجموع الثانوية العامة بشكل صحيح حيث سيتم استخدامه في تحديد الأقسام المتاحة لك.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Department Selection */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-right flex items-center gap-1">
                          الرغبة الأولى <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.firstChoice}
                          onValueChange={(value) => handleInputChange('firstChoice', value)}
                          required
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-right">الرغبة الثانية (اختياري)</Label>
                        <Select
                          value={formData.secondChoice}
                          onValueChange={(value) => handleInputChange('secondChoice', value)}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر القسم (اختياري)" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-right">الرغبة الثالثة (اختياري)</Label>
                        <Select
                          value={formData.thirdChoice}
                          onValueChange={(value) => handleInputChange('thirdChoice', value)}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر القسم (اختياري)" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label
                          htmlFor="terms"
                          className="text-sm font-normal cursor-pointer text-right leading-relaxed"
                        >
                          أوافق على الشروط والأحكام وأقر بأن جميع البيانات المقدمة صحيحة، وأتحمل كامل المسؤولية عن أي معلومات خاطئة.
                        </Label>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg text-right">
                      <h4 className="font-bold text-green-900 mb-2">✓ مراجعة البيانات</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>• الاسم: {formData.fullName}</p>
                        <p>• الرقم القومي: {formData.nationalId}</p>
                        <p>• مجموع الثانوية: {formData.highSchoolGrade} ({getPercentage()}%)</p>
                        <p>• الرغبة الأولى: {formData.firstChoice}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-8 border-t mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  size="lg"
                >
                  <ChevronRight className="ml-2" />
                  السابق
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button onClick={handleNext} size="lg">
                    التالي
                    <ChevronLeft className="mr-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin ml-2">⏳</span>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="ml-2" />
                        إرسال الطلب
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
